"use client";

import {
    ArrowRightLeft,
    Building2,
    ClipboardList,
    Command,
    LayoutDashboard,
    LineChart,
    Package,
    Route,
    Truck,
    Warehouse
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

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
import { NavMain } from "./nav-main";

const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/scm/",
            icon: LayoutDashboard, // 📊 Dashboard Logo
            isActive: true,
        },
        {
            title: "Product Management",
            url: "#",
            icon: Package, // 📦 Product Logo
            isActive: false,
            items: [
                {
                    title: "SKU",
                    url: "/scm/product-management/sku",
                    items: [
                        {
                            title: "SKU Masterlist",
                            url: "/scm/product-management/sku/sku-masterlist",
                        },
                        {
                            title: "SKU Registration",
                            url: "/scm/product-management/sku/sku-creation",
                        },
                        {
                            title: "SKU Approval Queue",
                            url: "/scm/product-management/sku/sku-approval",
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
            icon: Building2, // 🏢 Supplier/Company Logo
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
                {
                    title: "Inbound/Outbound Kiosk",
                    url: "/scm/inbound-outbound-kiosk",
                },
            ],
        },
        {
            title: "Warehouse Management",
            url: "#",
            icon: Warehouse, // 🏭 Warehouse Logo
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
                    items: [
                        {
                            title: "Pre Dispatch Plan",
                            url: "#",
                            items: [
                                {
                                    title: "PDP Creation",
                                    url: "/scm/warehouse-management/consolidation/pre-dispatch-plan/pdp-creation",
                                },
                                {
                                    title: "PDP Planner",
                                    url: "/scm/warehouse-management/consolidation/pre-dispatch-plan/pdp-planner",
                                },
                            ],
                        },
                        {
                            title: "Delivery Picking",
                            url: "/scm/warehouse-management/consolidation/delivery-picking",
                        },
                        {
                            title: "Withdrawals Picking",
                            url: "/scm/warehouse-management/withdrawals-picking",
                        },
                    ],
                },
            ],
        },
        {
            title: "Fleet Management",
            url: "#",
            icon: Truck, // 🚚 Fleet Logo
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
                        {
                            title: "Dispatch Creation",
                            url: "/scm/fleet-management/trip-management/dispatch-creation",
                        },
                        {
                            title: "Dispatch Plan",
                            url: "/scm/fleet-management/trip-management/dispatch-plan",
                            items: [
                                {
                                    title: "Creation",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/dispatch-creation",
                                },
                                {
                                    title: "Approval",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/approval",
                                },
                                {
                                    title: "Clearance",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/clearance",
                                },
                                {
                                    title: "Inbound",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/inbound",
                                },
                                {
                                    title: "Outbound",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/outbound",
                                },
                            ],
                        },
                        {
                            title: "Dispatch Clearance",
                            url: "/scm/fleet-management/trip-management/dispatch-clearance",
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
                            title: "PDP Summary",
                            url: "/scm/fleet-management/logistics-deliveries/pre-dispatch-summary",
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
            title: "Inventory Management",
            url: "#",
            icon: ClipboardList, // 📋 Inventory/List Logo
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
            title: "Logistics",
            url: "#",
            icon: Route, // 🗺️ Routing/Logistics Logo
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
            title: "Business Intelligence Analytics",
            url: "#",
            icon: LineChart, // 📈 Analytics Logo
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
        {
            title: "Transfers",
            url: "#",
            icon: ArrowRightLeft, // 🔁 Transfer Logo
            items: [
                {
                    title: "Stock Withdrawal",
                    url: "/scm/transfers/stock-withdrawal",
                },
                {
                    title: "Bad Stock Transfer",
                    url: "/scm/transfers/bad-stock-transfer",
                },
                {
                    title: "Stock Conversion",
                    url: "/scm/transfers/stock-conversion",
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