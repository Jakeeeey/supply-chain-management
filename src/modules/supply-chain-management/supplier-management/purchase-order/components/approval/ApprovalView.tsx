"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// ----- Types -----
interface Product {
    name: string;
    qty: number;
    price: number;
}

interface PO {
    poNumber: string;
    supplier: string;
    branch: string;
    created: string;
    products: Product[];
    markAsInvoice: boolean;
    paymentTerms: string;
    paymentStatus: string;
}

// ----- Mock Data -----
const MOCK_POS: PO[] = [
    {
        poNumber: "PO-0003",
        supplier: "Premiere Distributors",
        branch: "Main Warehouse - Downtown",
        created: "12/5/2026",
        products: [
            { name: "Stapler - heavy duty", qty: 30, price: 540 },
            { name: "File folder - legal size (pack of 25)", qty: 40, price: 480 },
        ],
        markAsInvoice: false,
        paymentTerms: "Cash with order",
        paymentStatus: "Payment due on delivery",
    },
    {
        poNumber: "PO-0004",
        supplier: "ABC Trading Co",
        branch: "Main Warehouse - Uptown",
        created: "12/6/2026",
        products: [
            { name: "Printer Paper A4", qty: 10, price: 500 },
            { name: "Pen Blue", qty: 50, price: 250 },
        ],
        markAsInvoice: false,
        paymentTerms: "Cash on delivery",
        paymentStatus: "Payment due on delivery",
    },
    {
        poNumber: "PO-0005",
        supplier: "Global Supplies",
        branch: "Branch Baguio",
        created: "12/7/2026",
        products: [
            { name: "Notebook", qty: 20, price: 400 },
            { name: "Marker Pen", qty: 15, price: 150 },
        ],
        markAsInvoice: false,
        paymentTerms: "Receive stocks and pay according to agreed terms",
        paymentStatus: "Payment due on delivery",
    },
];

// ----- Subcomponents -----

// Pending PO List
function POList({
                    pos,
                    selectedPO,
                    setSelectedPO,
                }: {
    pos: PO[];
    selectedPO: PO | null;
    setSelectedPO: (po: PO) => void;
}) {
    const calculateTotal = (products: Product[]) =>
        products.reduce((acc, item) => acc + item.price, 0);

    return (
        <div className="w-1/3 border rounded p-4 space-y-4">
            <h2 className="text-lg font-semibold">Pending Approval ({pos.length})</h2>
            {pos.map(po => (
                <div
                    key={po.poNumber}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-100 ${
                        selectedPO?.poNumber === po.poNumber ? "bg-gray-50 border-blue-500" : ""
                    }`}
                    onClick={() => setSelectedPO(po)}
                >
                    <p className="font-semibold">{po.poNumber}</p>
                    <p>{po.supplier}</p>
                    <p>
                        Branch: {po.branch} | Total: ₱{calculateTotal(po.products).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Created: {po.created}</p>
                </div>
            ))}
        </div>
    );
}

// Approval Details + Financial Summary
function ApprovalDetails({
                             po,
                             onInvoiceChange,
                             onApprove,
                         }: {
    po: PO;
    onInvoiceChange: (checked: boolean) => void;
    onApprove: () => void;
}) {
    const { subtotal, discount, tax, total } = (() => {
        const subtotal = po.products.reduce((acc, item) => acc + item.price, 0);
        const discount = 50; // mock
        const tax = (subtotal - discount) * 0.12;
        const total = subtotal - discount + tax;
        return { subtotal, discount, tax, total };
    })();

    return (
        <div className="w-2/3 border rounded p-4 space-y-4">
            <h2 className="text-lg font-semibold">Approval Details</h2>

            {/* PO Info and Mark as Invoice */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p>
                        <span className="font-semibold">PO Number:</span> {po.poNumber}
                    </p>
                    <p>
                        <span className="font-semibold">Supplier:</span> {po.supplier}
                    </p>
                    <p>
                        <span className="font-semibold">Branch:</span> {po.branch}
                    </p>
                    <p>
                        <span className="font-semibold">Products:</span> {po.products.length} items
                    </p>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="markInvoice">Mark as Invoice</Label>
                    <Checkbox
                        id="markInvoice"
                        checked={po.markAsInvoice}
                        onCheckedChange={onInvoiceChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Check if PO should be tagged as an invoice
                    </p>
                </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-1">
                <p className="font-semibold">Payment Terms:</p>
                <p>{po.paymentTerms}</p>
                <p className="font-semibold">Payment Status:</p>
                <p>{po.paymentStatus}</p>
            </div>

            {/* Financial Summary */}
            <div className="border-t pt-2 mt-2 space-y-2">
                <h3 className="font-semibold">Financial Summary</h3>
                <table className="w-full text-sm">
                    <thead>
                    <tr>
                        <th className="text-left">Product</th>
                        <th className="text-left">Qty</th>
                        <th className="text-right">Amount</th>
                    </tr>
                    </thead>
                    <tbody>
                    {po.products.map(item => (
                        <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.qty}</td>
                            <td className="text-right">₱{item.price.toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <div className="space-y-1 text-sm mt-2">
                    <p>Subtotal: ₱{subtotal.toFixed(2)}</p>
                    <p>Discount: ₱-{discount.toFixed(2)}</p>
                    <p>Tax (12%): ₱{tax.toFixed(2)}</p>
                    <p className="font-semibold">Total Amount Payable: ₱{total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                        Accounts Payable: {po.markAsInvoice ? "Will be affected" : "Not affected"}
                    </p>
                </div>
            </div>

            <Button onClick={onApprove} className="mt-4">
                Approve Purchase Order
            </Button>
        </div>
    );
}

// ----- Main Component -----
export default function ApprovalView() {
    const [pendingPOs, setPendingPOs] = useState(MOCK_POS);
    const [selectedPO, setSelectedPO] = useState<PO | null>(MOCK_POS[0]);

    const handleInvoiceChange = (checked: boolean) => {
        if (selectedPO) {
            setSelectedPO({ ...selectedPO, markAsInvoice: checked });
        }
    };

    const approvePO = () => {
        if (selectedPO) {
            alert(`PO ${selectedPO.poNumber} approved!`);
            const newPending = pendingPOs.filter(po => po.poNumber !== selectedPO.poNumber);
            setPendingPOs(newPending);
            setSelectedPO(newPending[0] || null);
        }
    };

    return (
        <div className="flex gap-6 p-6">
            <POList pos={pendingPOs} selectedPO={selectedPO} setSelectedPO={setSelectedPO} />
            {selectedPO && (
                <ApprovalDetails
                    po={selectedPO}
                    onInvoiceChange={handleInvoiceChange}
                    onApprove={approvePO}
                />
            )}
        </div>
    );
}
