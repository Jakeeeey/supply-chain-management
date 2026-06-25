import * as React from "react";
import { type ComponentProps } from "react";
import { AppSidebarClient } from "@/components/shared/app-sidebar/app-sidebar-client";
import { getSidebarNavigation } from "@/actions/app-sidebar";
import { Sidebar } from "@/components/ui/sidebar";
import { NavItem } from "@/types/navigation";

function injectSOSDistress(items: NavItem[]): NavItem[] {
  const nextItems = JSON.parse(JSON.stringify(items)) as NavItem[];
  
  const newItem: NavItem = {
    title: "SOS Distress",
    url: "/scm/fleet-management/emergency-management/driver-report",
    slug: "driver-report",
    status: "active",
    iconName: "Siren",
  };

  function traverse(list: NavItem[]): boolean {
    // 1. First look for emergency-management slug
    for (const item of list) {
      if (item.slug === "emergency-management") {
        item.items = item.items || [];
        if (!item.items.some(child => child.slug === "driver-report")) {
          item.items.push(newItem);
        }
        return true;
      }
    }
    
    // 2. Look for fleet-management slug
    for (const item of list) {
      if (item.slug === "fleet-management") {
        item.items = item.items || [];
        let em = item.items.find(child => child.slug === "emergency-management");
        if (!em) {
          em = {
            title: "Emergency Management",
            url: "#",
            slug: "emergency-management",
            status: "active",
            iconName: "Siren",
            items: []
          };
          item.items.push(em);
        }
        em.items = em.items || [];
        if (!em.items.some(child => child.slug === "driver-report")) {
          em.items.push(newItem);
        }
        return true;
      }
    }

    // 3. Recurse into children
    for (const item of list) {
      if (item.items && item.items.length > 0) {
        if (traverse(item.items)) return true;
      }
    }
    
    return false;
  }

  const success = traverse(nextItems);
  if (!success) {
    nextItems.push(newItem);
  }

  return nextItems;
}

export async function AppSidebar(props: ComponentProps<typeof Sidebar>) {
    // 1. Fetch data on the server using the shared action
    const rawItems = await getSidebarNavigation("scm");
    const items = injectSOSDistress(rawItems);

    return (
        <AppSidebarClient 
            {...props} 
            initialItems={items} 
            subsystemTitle="Supply Chain Management"
        />
    );
}
