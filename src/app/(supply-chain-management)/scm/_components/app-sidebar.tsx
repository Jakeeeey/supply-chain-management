"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Command,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "./nav-main";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/scm/",
      icon: BookOpen,
      isActive: true,
    },
    {
      title: "Product Management",
      url: "#",
      icon: SquareTerminal,
      isActive: false,
      items: [
        {
          title: "SKU Masterlist",
          url: "/scm/product-management/sku-masterlist",
        },
        {
          title: "SKU Registration",
          url: "/scm/product-management/sku-creation",
        },
        {
          title: "SKU Approval Queue",
          url: "/scm/product-management/sku-approval",
        },
        {
          title: "Barcoding",
          url: "/scm/product-management/barcode-management",
          items: [
            {
              title: "Barcode Masterlist",
              url: "/scm/product-management/barcode-management/barcode-masterlist",
            },
            {
              title: "Barcode Linking",
              url: "/scm/product-management/barcode-management/barcode-linking",
            },
          ],
        },
        {
          title: "Bundling",
          url: "#",
          items: [
            {
              title: "Bundle Creation",
              url: "/scm/product-management/bundle-creation",
            },
            {
              title: "Bundle Approval",
              url: "/scm/product-management/bundle-approval",
            },
            {
              title: "Bundle Masterlist",
              url: "/scm/product-management/bundle-masterlist",
            },
          ],
        },
        {
          title: "Brand",
          url: "/scm/product-management/brand",
        },
        {
          title: "Category",
          url: "/scm/product-management/category",
        },
        {
          title: "Unit of Measurement",
          url: "/scm/product-management/unit-of-measurement",
        },
      ],
    },
    {
      title: "Supplier Management",
      url: "#",
      icon: SquareTerminal,
      isActive: false,
      items: [
        {
          title: "Create Purchase Order",
          url: "/scm/supplier-management/create-of-purchase-order",
        },
        {
          title: "Approval of PO",
          url: "/scm/supplier-management/approval-of-purchase-order",
        },
        {
          title: "Tagging of PO",
          url: "/scm/supplier-management/tagging-of-po",
        },
        {
          title: "Receiving Products",
          url: "/scm/supplier-management/receiving-products",
        },
        {
          title: "Posting Of PO",
          url: "/scm/supplier-management/posting-of-purchase-order",
        },
        {
          title: "PurchaseOrderSummary",
          url: "/scm/supplier-management/purchase-order-summary",
        },
      ],
    },
    {
      title: "Warehouse Management",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Warehouse Unit Conversion",
          url: "/scm/warehouse-management/warehouse-unit-conversion",
        },
        {
          title: "Stock Transfer",
          url: "/scm/warehouse-management/stock-transfer",
        },
        {
          title: "Consolidation",
          url: "/scm/warehouse-management/consolidation",
        },
      ],
    },
    {
      title: "Fleet Management",
      url: "#",
      icon: BookOpen,
      isActive: false,
      items: [
        {
          title: "Vehicle Management",
          url: "#",
          items: [
            {
              title: "Vehicle List",
              url: "/scm/fleet-management/vehicle-management/vehicle-list",
            },
          ],
        },
        { title: "Driver Management", url: "#" },
        {
          title: "Trip Management",
          url: "#",
          items: [
            {
              title: "Dispatch Summary",
              url: "/scm/fleet-management/trip-management/dispatch-summary",
            },
          ],
        },
        {
          title: "Logistics and Deliveries",
          url: "#",
          items: [
            {
              title: "Delivery Statistics",
              url: "/scm/fleet-management/logistics-deliveries/delivery-statistics",
            },
            {
              title: "Logistics Summary",
              url: "/scm/fleet-management/logistics-deliveries/logistics-summary",
            },
            {
              title: "Pending Deliveries",
              url: "/scm/fleet-management/logistics-deliveries/pending-deliveries",
            },
            {
              title: "Pending Invoices",
              url: "/scm/fleet-management/logistics-deliveries/pending-invoices",
            },
          ],
        },
        { title: "Fleet Inventory", url: "#" },
      ],
    },
    {
      title: "Item & Master Data Management",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Raw Materials",
          url: "/scm/item-master-data-management/raw-materials",
        },
      ],
    },
    {
      title: "Receiving & Put-Away",
      url: "#",
      icon: BookOpen,
      items: [{ title: "Receiving", url: "/scm/receiving-put-away/receiving" }],
    },
    {
      title: "Inventory Management",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Inventory Controls",
          url: "/scm/inventory-management/inventory-controls",
        },
        {
          title: "Physical Inventory",
          url: "/scm/inventory-management/physical-inventory",
        },
        {
          title: "Branch Management",
          url: "/scm/inventory-management/branch-management",
        },
      ],
    },
    {
      title: "Order Fulfillment & Distribution",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Sales Order",
          url: "/scm/order-fulfillment-distribution/sales-order",
        },
        {
          title: "Sales Transaction",
          url: "/scm/order-fulfillment-distribution/sales-transaction",
        },
        {
          title: "Site Sales",
          url: "/scm/order-fulfillment-distribution/site-sales",
        },
      ],
    },
    {
      title: "Returns & Reverse Logistics",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Sales Return",
          url: "/scm/returns-reverse-logistics/sales-return",
        },
        {
          title: "Bad Order Transfer",
          url: "/scm/returns-reverse-logistics/bad-order-stock-transfer",
        },
        {
          title: "Returns to Supplier",
          url: "/scm/returns-reverse-logistics/returns-to-supplier",
        },
      ],
    },
    {
      title: "Traceability & Compliance",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Audit Inventory",
          url: "/scm/traceability-compliance/audit-inventory",
        },
        {
          title: "Post Delivery Audit",
          url: "/scm/traceability-compliance/post-delivery-audit",
        },
        {
          title: "Product Ledger",
          url: "/scm/traceability-compliance/product-ledger",
        },
      ],
    },
    {
      title: "Logistics",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Vehicle Management",
          url: "#",
          items: [
            {
              title: "Vehicle Type",
              url: "/scm/logistics/vehicle-management/vehicle-type",
            },
            {
              title: "Fuel Type",
              url: "/scm/logistics/vehicle-management/fuel-type",
            },
            {
              title: "Category",
              url: "/scm/logistics/vehicle-management/category",
            },
            {
              title: "Engine Type",
              url: "/scm/logistics/vehicle-management/engine-type",
            },
          ],
        },
      ],
    },
    {
      title: "Reporting & KPIs",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Inventory Reports",
          url: "/scm/reporting-kpi/inventory-reports",
        },
        { title: "Sales Report", url: "/scm/reporting-kpi/sales-report" },
        { title: "PO Summary", url: "/scm/reporting-kpi/po-summary" },
        {
          title: "Bad Product Summary",
          url: "/scm/reporting-kpi/bad-product-summary",
        },
      ],
    },
    {
      title: "Business Intelligence Analytics",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Inventory Performance Dashboard",
          url: "/scm/business-analytics/inventory-performance-dashboard",
        },
        {
          title: "Stock Health Monitor",
          url: "/scm/business-analytics/stock-health-monitor",
        },
        {
          title: "Supplier Reliability Scorecard",
          url: "/scm/business-analytics/supplier-reliability-scorecard",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/main-dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">VOS Web</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Supply Chain Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <div className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
          Platform
        </div>
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="p-0">
        <Separator />
        <div className="py-3 text-center text-xs text-muted-foreground">
          VOS Web v2.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
