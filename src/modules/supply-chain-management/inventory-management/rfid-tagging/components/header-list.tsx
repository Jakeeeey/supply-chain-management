import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCcw, Box, Store, Tag, Edit, Send } from "lucide-react";
import { RfidHeader } from "../types";
import { toast } from "sonner";
import { format } from "date-fns";

interface HeaderListProps {
  onCreateNew: () => void;
  onEdit: (id: number) => void;
}

export function HeaderList({ onCreateNew, onEdit }: HeaderListProps) {
  const [headers, setHeaders] = useState<RfidHeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postingId, setPostingId] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/scm/inventory-management/rfid-tagging/headers");
      if (!res.ok) throw new Error("Failed to fetch RFID headers");
      const headersData = await res.json();
      setHeaders(headersData || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error fetching data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePost = async (id: number) => {
    if (!confirm("Are you sure you want to post this batch? You won't be able to add more tags to it.")) return;
    
    setPostingId(id);
    try {
      const res = await fetch(`/api/scm/inventory-management/rfid-tagging/headers/${id}/post`, {
        method: "POST"
      });
      if (!res.ok) {
        const errStr = await res.json();
        throw new Error(errStr.message || "Failed to post batch");
      }
      toast.success("Batch successfully posted!");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error posting batch");
    } finally {
      setPostingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end bg-card p-6 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            RFID Tagging Batches
          </h2>
          <p className="text-sm text-muted-foreground font-medium">Manage and view all registered RFID tagging sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="rounded-xl border-primary/20 hover:bg-primary/5">
            <RefreshCcw className={`h-4 w-4 text-primary ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={onCreateNew} className="gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold">
            <Plus className="h-4 w-4" />
            New Batch
          </Button>
        </div>
      </div>

      <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold uppercase text-xs tracking-wider">Reference No</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Branch</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Product</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Tags Captured</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Status</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Created At</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <RefreshCcw className="h-6 w-6 animate-spin opacity-50" />
                    <span className="text-sm font-medium">Loading batches...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : headers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Tag className="h-10 w-10 opacity-20" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">No batches found</p>
                      <p className="text-sm">Click &quot;New Batch&quot; to start tagging RFIDs.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              headers.map((header) => {
                const branch = header.branch as Record<string, unknown>;
                const product = header.product as Record<string, unknown>;
                const bName = String(branch ? (branch.branch_name || branch.branchName || branch.name || header.branch_id) : header.branch_id);
                const pName = String(product ? (product.description || product.product_name || product.product_code || header.product_id) : header.product_id);
                
                const isPosted = !!header.posted_at;

                return (
                  <TableRow key={header.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-background font-bold tracking-tight text-[11px] py-1 border-primary/20">
                        {header.reference_no}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[150px]" title={String(bName)}>{bName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Box className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[250px]" title={String(pName)}>{pName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-black">
                        {header.rfid_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isPosted ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold">
                          Posted
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold">
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {header.created_at ? format(new Date(header.created_at + (header.created_at.endsWith("Z") ? "" : "Z")), "MMM d, yyyy • h:mm a") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(header.id)}
                          className="h-8 gap-2 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          {isPosted ? "View" : "Edit"}
                        </Button>
                        {!isPosted && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePost(header.id)}
                            disabled={postingId === header.id || (header.rfid_count || 0) === 0}
                            className="h-8 gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
                          >
                            {postingId === header.id ? (
                              <RefreshCcw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Post
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
