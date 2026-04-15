import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertOctagon } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    cldtoNo: string;
}

export function ForceEndDialog({ isOpen, onClose, onConfirm, cldtoNo }: Props) {
    const [inputValue, setInputValue] = useState("");
    const [hasError, setHasError] = useState(false);

    const handleConfirm = () => {
        if (inputValue.trim().toLowerCase() === cldtoNo.trim().toLowerCase()) {
            onConfirm();
        } else {
            setHasError(true);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (hasError) {
            setHasError(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-4">
                <DialogHeader>
                    <DialogTitle
                        className="flex items-center gap-2 text-destructive font-black uppercase text-base tracking-widest">
                        <AlertOctagon className="h-4 w-4" /> Incomplete Batch
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium mt-1">
                        Type <strong className="text-foreground">{cldtoNo}</strong> below to confirm.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 py-2">
                    <Input
                        placeholder="Enter CLDTO No."
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        className={`h-10 text-center font-mono font-bold text-sm tracking-widest uppercase ${hasError ? "border-destructive bg-destructive/5" : ""}`}
                    />
                    {hasError && (
                        <p className="text-[10px] font-bold text-destructive text-center uppercase">
                            Incorrect Number
                        </p>
                    )}
                </div>
                <DialogFooter className="flex-row gap-2 mt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1 text-xs font-bold uppercase">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={!inputValue.trim()}
                        className="flex-1 text-xs font-black uppercase"
                    >
                        Force End
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
