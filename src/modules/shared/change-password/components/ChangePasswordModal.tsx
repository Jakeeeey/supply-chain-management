import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ChangePasswordForm } from "./ChangePasswordForm";

interface ChangePasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal = ({ open, onOpenChange }: ChangePasswordModalProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="sm:max-w-md dark:border-zinc-700 max-h-[90vh] overflow-y-auto"
                showCloseButton={false}
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogClose className="absolute right-4 top-4 rounded-full p-2 bg-muted/30 hover:bg-muted/60 transition-all focus:outline-none focus:ring-2 focus:ring-ring z-50 group cursor-pointer">
                    <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    <span className="sr-only">Close</span>
                </DialogClose>
                <DialogHeader className="sr-only">
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Update your password to keep your account secure.
                    </DialogDescription>
                </DialogHeader>
                <ChangePasswordForm onSuccess={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
};
