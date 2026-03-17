"use client";

import { FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type {
    BranchRow,
    CategoryRow,
    OffsetMatchRow,
    OffsetOverDisplayRow,
    OffsetShortDisplayRow,
    OffsetSummary,
    PhysicalInventoryHeaderRow,
    SupplierRow,
} from "../types";
import { printOffsetReport } from "../utils";

type Props = {
    header: PhysicalInventoryHeaderRow | null;
    branch: BranchRow | null;
    supplier: SupplierRow | null;
    category: CategoryRow | null;
    shortRows: OffsetShortDisplayRow[];
    overRows: OffsetOverDisplayRow[];
    matchRows: OffsetMatchRow[];
    summary: OffsetSummary;
};

export function OffsetPrintButton({
                                      header,
                                      branch,
                                      supplier,
                                      category,
                                      shortRows,
                                      overRows,
                                      matchRows,
                                      summary,
                                  }: Props) {
    const handlePrint = () => {
        try {
            printOffsetReport({
                header,
                branch,
                supplier,
                category,
                shortRows,
                overRows,
                matchRows,
                summary,
            });
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to generate the print report.";

            toast.error(message);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={handlePrint}
        >
            <FileText className="mr-2 h-4 w-4" />
            Print Findings Report
        </Button>
    );
}