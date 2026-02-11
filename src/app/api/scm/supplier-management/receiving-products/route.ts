import { NextRequest, NextResponse } from "next/server";

/**
 * NOTE:
 * - Barcode/RFID in web usually arrives as keyboard input + Enter.
 * - This API is mock data to match your wireframe UI.
 */

type POStatus = "OPEN" | "PARTIAL" | "CLOSED";

type Supplier = { id: string; name: string };
type Branch = { id: string; name: string };

type POItem = {
    id: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    expectedQty: number;
    receivedQty: number;
    requiresRfid?: boolean;
};

type POBranchAllocation = {
    branch: Branch;
    items: POItem[];
};

type PurchaseOrder = {
    id: string;
    poNumber: string;
    supplier: Supplier;
    status: POStatus;
    totalAmount: number;
    currency: "PHP" | "USD";
    barcodeValue: string; // what is printed on PO barcode
    allocations: POBranchAllocation[];
    createdAt: string;
};

const MOCK_POS: PurchaseOrder[] = [
    {
        id: "po_1",
        poNumber: "PO-0001",
        supplier: { id: "sup_1", name: "ABC Trading Co." },
        status: "OPEN",
        totalAmount: 2520,
        currency: "USD",
        barcodeValue: "PO-0001",
        createdAt: new Date().toISOString(),
        allocations: [
            {
                branch: { id: "unassigned", name: "Unassigned" },
                items: [
                    {
                        id: "poi_1",
                        productId: "prod_1",
                        name: "Office Chair - Ergonomic",
                        barcode: "1234567890123",
                        uom: "pc",
                        expectedQty: 10,
                        receivedQty: 0,
                        requiresRfid: false,
                    },
                    {
                        id: "poi_2",
                        productId: "prod_2",
                        name: "Desk Lamp - LED",
                        barcode: "9876543210987",
                        uom: "pc",
                        expectedQty: 20,
                        receivedQty: 0,
                        requiresRfid: true,
                    },
                ],
            },
        ],
    },
    {
        id: "po_2",
        poNumber: "PO-0002",
        supplier: { id: "sup_2", name: "Global Supplies Inc." },
        status: "PARTIAL",
        totalAmount: 3752,
        currency: "USD",
        barcodeValue: "PO-0002",
        createdAt: new Date().toISOString(),
        allocations: [
            {
                branch: { id: "unassigned", name: "Unassigned" },
                items: [
                    {
                        id: "poi_3",
                        productId: "prod_3",
                        name: "Bond Paper A4",
                        barcode: "1111111111111",
                        uom: "ream",
                        expectedQty: 30,
                        receivedQty: 12,
                        requiresRfid: false,
                    },
                    {
                        id: "poi_4",
                        productId: "prod_4",
                        name: "Ink Cartridge - Black",
                        barcode: "2222222222222",
                        uom: "pc",
                        expectedQty: 10,
                        receivedQty: 3,
                        requiresRfid: false,
                    },
                    {
                        id: "poi_5",
                        productId: "prod_5",
                        name: "Label Sticker Roll",
                        barcode: "3333333333333",
                        uom: "roll",
                        expectedQty: 15,
                        receivedQty: 0,
                        requiresRfid: false,
                    },
                ],
            },
        ],
    },
    {
        id: "po_5",
        poNumber: "PO-0005",
        supplier: { id: "sup_3", name: "Pacific Imports" },
        status: "PARTIAL",
        totalAmount: 5286.4,
        currency: "USD",
        barcodeValue: "PO-0005",
        createdAt: new Date().toISOString(),
        allocations: [
            {
                branch: { id: "unassigned", name: "Unassigned" },
                items: [
                    {
                        id: "poi_6",
                        productId: "prod_6",
                        name: "Storage Bin - Medium",
                        barcode: "4444444444444",
                        uom: "pc",
                        expectedQty: 12,
                        receivedQty: 0,
                        requiresRfid: false,
                    },
                    {
                        id: "poi_7",
                        productId: "prod_7",
                        name: "Handheld Scanner Stand",
                        barcode: "5555555555555",
                        uom: "pc",
                        expectedQty: 4,
                        receivedQty: 0,
                        requiresRfid: false,
                    },
                    {
                        id: "poi_8",
                        productId: "prod_8",
                        name: "RFID Tag Pack (UHF)",
                        barcode: "6666666666666",
                        uom: "pack",
                        expectedQty: 2,
                        receivedQty: 0,
                        requiresRfid: false,
                    },
                ],
            },
        ],
    },
];

function summarizePO(po: PurchaseOrder) {
    const itemsCount = po.allocations.reduce((acc, a) => acc + a.items.length, 0);
    // In your wireframe list it shows Branches: 0 (even if Unassigned exists)
    const branchesCount = 0;
    return {
        id: po.id,
        poNumber: po.poNumber,
        supplierName: po.supplier.name,
        status: po.status,
        totalAmount: po.totalAmount,
        currency: po.currency,
        itemsCount,
        branchesCount,
    };
}

export async function GET() {
    return NextResponse.json({
        data: MOCK_POS.map(summarizePO),
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const action = body?.action as string;

        if (action === "verify_po") {
            const barcode = String(body?.barcode ?? "").trim();
            if (!barcode) {
                return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
            }
            const po = MOCK_POS.find(
                (x) => x.barcodeValue.toLowerCase() === barcode.toLowerCase()
            );
            if (!po) {
                return NextResponse.json({ error: "PO not found" }, { status: 404 });
            }
            return NextResponse.json({ data: po });
        }

        if (action === "save_receipt") {
            // For now return success. Hook this to your backend later.
            // Expected payload shape:
            // { receipt: { ... }, poId, branchId, receivedLines: [...], rfidMap: {...} }
            return NextResponse.json({
                data: { ok: true, receiptId: `REC-${Math.floor(Math.random() * 9000 + 1000)}` },
            });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message ?? "Failed request" },
            { status: 500 }
        );
    }
}
