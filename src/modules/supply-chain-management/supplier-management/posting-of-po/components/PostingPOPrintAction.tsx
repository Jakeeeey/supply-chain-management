"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Printer, Eye } from "lucide-react";
import { usePostingOfPo } from "../providers/PostingOfPoProvider";
import { generatePostingPOPrint } from "../utils/generatePostingPOPrint";

export function PostingPOPrintAction() {
    const { selectedPO, discountTypes } = usePostingOfPo();

    const handlePrint = React.useCallback(() => {
        if (!selectedPO) return;
        const doc = generatePostingPOPrint({ po: selectedPO, discountTypes });
        doc.autoPrint();
        window.open(doc.output("bloburl"), "_blank");
    }, [selectedPO, discountTypes]);

    const handlePreview = React.useCallback(() => {
        if (!selectedPO) return;
        const doc = generatePostingPOPrint({ po: selectedPO, discountTypes });
        window.open(doc.output("bloburl"), "_blank");
    }, [selectedPO, discountTypes]);

    if (!selectedPO) return null;

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview} className="hidden sm:flex" title="Print Preview">
                <Eye className="w-4 h-4 mr-1.5" />
                Preview
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="bg-primary hover:bg-primary/90" title="Print Invoice">
                <Printer className="w-4 h-4 mr-1.5" />
                Print
            </Button>
        </div>
    );
}
