import { FileText } from "lucide-react";

export function POInfoCard({ poNumber }: { poNumber: string }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border bg-blue-50 px-4 py-3">
            <div className="rounded-md bg-blue-100 p-2 text-blue-600">
                <FileText size={18} />
            </div>

            <div>
                <p className="text-xs text-muted-foreground">
                    PO Number
                </p>
                <p className="text-sm font-semibold text-blue-600">
                    {poNumber}
                </p>
            </div>
        </div>
    );
}
