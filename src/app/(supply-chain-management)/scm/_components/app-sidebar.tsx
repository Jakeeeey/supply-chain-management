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
    Warehouse,
    Search
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useState, useMemo } from "react";

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input"; // Make sure you have the shadcn Input component installed!
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
            icon: LayoutDashboard,
            isActive: true,
        },
        {
            title: "Product Management",
            url: "#",
            icon: Package,
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
            title: "Outbound",
            url: "#",
            icon: Package,
            items: [
                {
                    title: "Return to Supplier",
                    url: "/scm/outbound/return-to-supplier",
                },
            ],
        },
        {
            title: "Supplier Management",
            url: "#",
            icon: Building2,
            items: [
                {
                    title: "Create Purchase Order",
                    url: "/scm/supplier-management/create-of-purchase-order",
                },
                {
                    title: "Approval of Purchase Order",
                    url: "/scm/supplier-management/approval-of-purchase-order",
                },
                {
                    title: "Tagging of Purchase Order",
                    url: "/scm/supplier-management/tagging-of-po",
                },
                {
                    title: "Receiving Products",
                    url: "/scm/supplier-management/receiving-products",
                },
                {
                    title: "Receiving Products Manual",
                    url: "/scm/supplier-management/receiving-products-manual",
                },
                {
                    title: "Posting Of Purchase Order",
                    url: "/scm/supplier-management/posting-of-purchase-order",
                },
                {
                    title: "Purchase Order Summary",
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
            icon: Warehouse,
            items: [
                {
                    title: "Warehouse Unit Conversion",
                    url: "/scm/warehouse-management/warehouse-unit-conversion",
                },
                {
                    title: "Stock Transfer",
                    url: "/scm/warehouse-management/stock-transfer",
                    items: [
                        {
                            title: "Request",
                            url: "/scm/warehouse-management/stock-transfer/request"
                        },
                        {
                            title: "Approval",
                            url: "/scm/warehouse-management/stock-transfer/approval"
                        },
                        {
                            title: "Dispatching",
                            url: "/scm/warehouse-management/stock-transfer/dispatching"
                        },
                        {
                            title: "Receive",
                            url: "/scm/warehouse-management/stock-transfer/receive"
                        }
                    ]
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
                                    url: "/scm/warehouse-management/consolidation/pre-dispatch-plan/pdp-creation"
                                },
                                {
                                    title: "PDP Planner",
                                    url: "/scm/warehouse-management/consolidation/pre-dispatch-plan/pdp-planner"
                                },
                            ],
                        },
                        {
                            title: "Delivery Picking",
                            url: "/scm/warehouse-management/consolidation/delivery-picking",
                        }, {
                            title: "Delivery Auditing",
                            url: "/scm/warehouse-management/consolidation/delivery-auditing",
                        },
                        {
                            title: "Withdrawals Picking",
                            url: "/scm/warehouse-management/withdrawals-picking",
                        }, {
                            title: "Active Picking",
                            url: "/scm/warehouse-management/active-picking",
                        },
                    ],
                },
            ],
        },
        {
            title: "Fleet Management",
            url: "#",
            icon: Truck,
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
                            url: "#",
                            items: [
                                {
                                    title: "Creation",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/dispatch-creation"
                                },
                                {
                                    title: "Approval",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/approval"
                                },
                                {
                                    title: "Clearance",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/clearance"
                                },
                                {
                                    title: "Inbound",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/inbound",
                                },
                                {
                                    title: "Outbound",
                                    url: "/scm/fleet-management/trip-management/dispatch-plan/outbound"
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
                            url: "/scm/fleet-management/logistics-deliveries/delivery-statistics"
                        },
                        {
                            title: "Logistics Summary",
                            url: "/scm/fleet-management/logistics-deliveries/logistics-summary"
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
                {
                    title: "Driver Management",
                    url: "/scm/fleet-management/driver-management",
                },
                {
                    title: "Fleet Inventory",
                    url: "#",
                },
            ],
        },
        {
            title: "Inventory Management",
            url: "#",
            icon: ClipboardList,
            items: [
                {
                    title: "Inventory Controls",
                    url: "/scm/inventory-management/inventory-controls",
                    items: [
                        {
                            title: "Purchase Planning",
                            url: "/scm/inventory-management/inventory-controls/purchase-planning",
                        },
                    ]

                },
                {
                    title: "Physical Inventory",
                    url: "/scm/inventory-management/physical-inventory",
                    items: [
                        {
                            title: "Physical Count (RFID)",
                            url: "/scm/inventory-management/physical-inventory   ",
                        },
                        {
                            title: "Offsetting",
                            url: "/scm/inventory-management/physical-inventory/offsetting   ",
                        },
                        {
                            title: "Manual Count (No RFID)",
                            url: "/scm/inventory-management/physical-inventory-manual",
                        },
                    ]
                },
                {
                    title: "Branch Management",
                    url: "/scm/inventory-management/branch-management",
                },
                {
                    title: "Stock Adjustment",
                    url: "/scm/inventory-management/stock-adjustment",
                }
            ],
        },
        {
            title: "Logistics",
            url: "#",
            icon: Route,
            items: [
                {
                    title: "Monitoring",
                    url: "#",
                    items: [
                        {
                            title: "For Consolidation Queue",
                            url: "/scm/monitoring/for-consolidation",
                        }
                    ]
                },
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
            icon: LineChart,
            items: [
                {
                    title: "Inventory Performance Dashboard",
                    url: "/scm/business-analytics/inventory-performance-dashboard"
                },
                {
                    title: "Stock Health Monitor",
                    url: "/scm/business-analytics/stock-health-monitor",
                },
                {
                    title: "Supplier Reliability Scorecard",
                    url: "/scm/business-analytics/supplier-reliability-scorecard"
                },
            ],
        },
        {
            title: "Transfers",
            url: "#",
            icon: ArrowRightLeft,
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
    const [searchQuery, setSearchQuery] = useState("");

    const filteredNavMain = useMemo(() => {
        if (!searchQuery.trim()) return data.navMain;
        const lowerQuery = searchQuery.toLowerCase();

        const filterItems = (items: any[]) => {
            return items.reduce((acc, item) => {
                // Check if current item matches
                const isMatch = item.title.toLowerCase().includes(lowerQuery);
                // Recursively check children
                const childMatches = item.items ? filterItems(item.items) : [];

                // If parent matches, show it and all its original children
                if (isMatch) {
                    acc.push(item);
                }
                // If a child matches, show the parent but ONLY the matching children
                else if (childMatches.length > 0) {
                    acc.push({ ...item, items: childMatches });
                }

                return acc;
            }, []);
        };

        return filterItems(data.navMain);
    }, [searchQuery]);

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/main-dashboard">
                                <div
                                    className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
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

                <div className="px-4 py-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search modules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-xs bg-sidebar-accent/50 focus-visible:ring-1"
                        />
                    </div>
                </div>
            </SidebarHeader>

            <Separator />

            <SidebarContent>
                <div className="px-4 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                    Platform
                </div>
                {/* 👇 Pass the filtered data instead of the raw data 👇 */}
                <NavMain items={filteredNavMain} />
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