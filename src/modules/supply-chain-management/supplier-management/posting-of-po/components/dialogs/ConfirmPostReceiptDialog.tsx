"use client";

import * as React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BaseProps = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: () => Promise<void> | void;
    loading?: boolean;

    // optional (para di mag-break kung may pinapasa)
    count?: number;
} & Record<string, any>;

export function ConfirmPostReceiptDialog(props: BaseProps) {
    const { open, onOpenChange, onConfirm, loading } = props;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Post Receipt</AlertDialogTitle>
                    <AlertDialogDescription>
                        Once posted, this receipt cannot be edited. Continue?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={!!loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!!loading}
                        onClick={async (e) => {
                            e.preventDefault();
                            await onConfirm();
                        }}
                    >
                        {loading ? "Posting..." : "OK"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/**
 * ✅ Added to satisfy import:
 * import { ConfirmPostAllReceiptsDialog } from "./dialogs/ConfirmPostReceiptDialog";
 * No flow change — same shadcn dialog behavior, different copy only.
 */
export function ConfirmPostAllReceiptsDialog(props: BaseProps) {
    const { open, onOpenChange, onConfirm, loading, count } = props;

    const label = typeof count === "number" && count > 0 ? ` (${count})` : "";

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Post All Receipts{label}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Once posted, receipts cannot be edited. Continue?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={!!loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!!loading}
                        onClick={async (e) => {
                            e.preventDefault();
                            await onConfirm();
                        }}
                    >
                        {loading ? "Posting..." : "OK"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default ConfirmPostReceiptDialog;
