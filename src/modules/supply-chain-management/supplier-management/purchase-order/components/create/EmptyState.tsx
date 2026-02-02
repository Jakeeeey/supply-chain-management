import { Package } from "lucide-react";

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
                <Package className="text-muted-foreground" />
            </div>

            <p className="text-sm font-medium">
                Add a branch to get started
            </p>
            <p className="text-xs text-muted-foreground">
                Products will be organized by delivery branch
            </p>
        </div>
    );
}
