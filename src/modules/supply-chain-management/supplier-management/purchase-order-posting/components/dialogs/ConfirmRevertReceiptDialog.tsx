/* eslint-disable @typescript-eslint/no-explicit-any */
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
    receiptNo?: string;
} & Record<string, any>;

export function ConfirmRevertReceiptDialog(props: BaseProps) {
    const { open, onOpenChange, onConfirm, loading, receiptNo } = props;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Revert Receipt to Receiving</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to revert receipt{" "}
                        <span className="font-semibold">{receiptNo || "—"}</span> back
                        to receiving? The received quantities for this receipt will be
                        reset to zero and you will need to re-receive them in the
                        Receiving module.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={!!loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!!loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={async (e) => {
                            e.preventDefault();
                            await onConfirm();
                        }}
                    >
                        {loading ? "Reverting..." : "Yes, Revert"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default ConfirmRevertReceiptDialog;
