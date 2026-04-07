import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "../../_components/nav-user"; // Relative path base sa iyong example

import { cookies } from "next/headers";
import { getDirectusBase, directusHeaders } from "@/lib/directus";

import PurchaseOrderSummaryModule from "@/modules/supply-chain-management/supplier-management/purchase-order-summary/PurchaseOrderSummaryModule";
import { Supplier } from "./types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

// --- JWT Helper Functions ---
function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function pickString(obj: any, keys: string[]): string {
    for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function buildHeaderUserFromToken(token: string | null | undefined) {
    const payload = token ? decodeJwtPayload(token) : null;

    const first = pickString(payload, ["Firstname", "FirstName", "firstName", "firstname", "first_name"]);
    const last = pickString(payload, ["LastName", "Lastname", "lastName", "lastname", "last_name"]);
    const email = pickString(payload, ["email", "Email"]);

    const name = [first, last].filter(Boolean).join(" ") || email || "User";

    return {
        name,
        email: email || "",
        avatar: "/avatars/shadcn.jpg",
    };
}

// --- Data Fetching ---
async function getData() {
    try {
        const base = getDirectusBase();
        const headers = directusHeaders();

        const [poRes, supRes, payRes, transRes, porRes, popRes] = await Promise.all([
            fetch(`${base}/items/purchase_order?limit=-1`, { cache: "no-store", headers }),
            fetch(`${base}/items/suppliers?limit=-1`, { cache: "no-store", headers }),
            fetch(`${base}/items/payment_status?limit=-1`, { cache: "no-store", headers }),
            fetch(`${base}/items/transaction_status?limit=-1`, { cache: "no-store", headers }),
            fetch(`${base}/items/purchase_order_receiving?limit=-1&fields=purchase_order_product_id,purchase_order_id,received_quantity,isPosted,receipt_no`, { cache: "no-store", headers }),
            fetch(`${base}/items/purchase_order_product?limit=-1&fields=purchase_order_product_id,purchase_order_id,quantity`, { cache: "no-store", headers }),
        ]);

        const pos = await poRes.json();
        const sups = await supRes.json();
        const pays = await payRes.json();
        const trans = await transRes.json();
        const porData = await porRes.json();
        const popData = await popRes.json();

        const allSuppliers = sups.data || [];
        const porRows: any[] = porData.data || [];
        const popRows: any[] = popData.data || [];

        // Build maps: PO → total ordered qty, PO → total received qty, PO → has receipts
        const orderedByPo = new Map<number, number>();
        for (const p of popRows) {
            const poId = Number(p.purchase_order_id);
            orderedByPo.set(poId, (orderedByPo.get(poId) || 0) + Number(p.quantity || 0));
        }

        const receivedByPo = new Map<number, number>();
        const hasReceiptByPo = new Map<number, boolean>();
        for (const r of porRows) {
            const poId = Number(r.purchase_order_id);
            receivedByPo.set(poId, (receivedByPo.get(poId) || 0) + Number(r.received_quantity || 0));
            if (r.receipt_no || Number(r.received_quantity) > 0) {
                hasReceiptByPo.set(poId, true);
            }
        }

        // Derive accurate inventory_status for each PO
        const poList = (pos.data || []).map((po: any) => {
            const poId = Number(po.purchase_order_id);
            const dbStatus = Number(po.inventory_status || 0);
            const hasReceipt = hasReceiptByPo.get(poId) || false;
            const totalOrdered = orderedByPo.get(poId) || 0;
            const totalReceived = receivedByPo.get(poId) || 0;
            const isApproved = po.date_approved || po.approver_id;

            let effectiveStatus = dbStatus;
            // Only override if status is stale (still 1="For Approval" but activity proves otherwise)
            if (dbStatus === 1) {
                if (hasReceipt && totalOrdered > 0 && totalReceived >= totalOrdered) {
                    effectiveStatus = 6; // Received
                } else if (hasReceipt) {
                    effectiveStatus = 9; // Partially Received
                } else if (isApproved) {
                    effectiveStatus = 3; // For Receiving (approved but no receipts)
                }
            }

            return { ...po, inventory_status: effectiveStatus };
        });

        return { 
            poData: poList, 
            suppliers: allSuppliers,
            paymentStatuses: pays.data || [],
            transactionStatuses: trans.data || []
        };
    } catch (error) {
        console.error("Fetch error:", error);
        return { poData: [], suppliers: [], paymentStatuses: [], transactionStatuses: [] };
    }
}

export default async function Page() {
    // ✅ Next.js cookies() is async
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;

    const headerUser = buildHeaderUserFromToken(token);
    const { poData, suppliers, paymentStatuses, transactionStatuses } = await getData();

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ===== Header (Matched with Posting Page) ===== */}
            <header
                className="
                    sticky top-2 z-50 relative
                    flex h-16 shrink-0 items-center justify-between
                    border-b bg-background shadow-sm
                    before:content-[''] before:absolute before:inset-x-0
                    before:-top-2 before:h-2 before:bg-background
                "
            >
                <div className="flex h-full items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />

                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">
                                    Supplier Management
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                    Purchase Order Summary
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex h-full items-center px-4">
                    <NavUser user={headerUser} />
                </div>
            </header>

            {/* ===== Content ===== */}
            <ScrollArea className="min-h-0 flex-1">
                <div className="p-4">
                    <PurchaseOrderSummaryModule 
                        poData={poData} 
                        suppliers={suppliers} 
                        paymentStatuses={paymentStatuses}
                        transactionStatuses={transactionStatuses}
                    />
                </div>
            </ScrollArea>
        </div>
    );
}