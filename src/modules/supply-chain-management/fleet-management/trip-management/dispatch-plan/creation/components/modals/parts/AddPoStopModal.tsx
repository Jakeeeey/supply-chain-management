"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const poStopSchema = z.object({
  po_id: z.number().min(1, "Purchase Order is required"),
  distance: z.number().min(0, "Distance must be non-negative"),
});

type PoStopValues = z.infer<typeof poStopSchema>;

interface AddPoStopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (stop: { po_id: number; po_no: string; distance: number }) => void;
}

interface POOption {
  purchase_order_id: number;
  purchase_order_no: string;
  date?: string;
  supplier_name?: number | string;
  total_amount?: number | null;
  inventory_status?: number;
}

const inventoryStatusLabel: Record<number, string> = {
  1: "Pending",
  2: "Partial",
  3: "Received",
  4: "Cancelled",
};

export function AddPoStopModal({
  open,
  onOpenChange,
  onAdd,
}: AddPoStopModalProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<POOption[]>([]);
  const [isLoadingPOs, setIsLoadingPOs] = useState(false);
  const [poOpen, setPoOpen] = useState(false);

  const form = useForm<PoStopValues>({
    resolver: zodResolver(poStopSchema),
    defaultValues: {
      po_id: 0,
      distance: 0,
    },
  });

  useEffect(() => {
    if (open) {
      loadPurchaseOrders();
      form.reset({
        po_id: 0,
        distance: 0,
      });
    }
  }, [open, form]);

  const loadPurchaseOrders = async (query = "") => {
    setIsLoadingPOs(true);
    try {
      const res = await fetch(
        `/api/scm/fleet-management/trip-management/dispatch-plan/creation?type=purchase_orders&query=${encodeURIComponent(query)}`,
      );
      const result = await res.json();
      setPurchaseOrders(result.data || []);
    } catch {
      toast.error("Failed to load purchase orders");
    } finally {
      setIsLoadingPOs(false);
    }
  };

  const onSubmit = (values: PoStopValues) => {
    const selectedPo = purchaseOrders.find(
      (p) => p.purchase_order_id === values.po_id,
    );
    if (!selectedPo) return;

    onAdd({
      po_id: selectedPo.purchase_order_id,
      po_no: selectedPo.purchase_order_no,
      distance: values.distance,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <DialogTitle>Add PO Stop</DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="po_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Order</FormLabel>
                  <Popover open={poOpen} onOpenChange={setPoOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? purchaseOrders.find(
                                (p) => p.purchase_order_id === field.value,
                              )?.purchase_order_no
                            : "Select purchase order..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search PO number..."
                          onValueChange={(val) => {
                            loadPurchaseOrders(val);
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingPOs ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              "No PO found."
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {purchaseOrders.map((po) => (
                              <CommandItem
                                key={po.purchase_order_id}
                                value={po.purchase_order_no}
                                onSelect={() => {
                                  form.setValue("po_id", po.purchase_order_id);
                                  setPoOpen(false);
                                }}
                                className="flex items-start gap-2 py-2"
                              >
                                <Check
                                  className={cn(
                                    "mt-0.5 h-4 w-4 shrink-0",
                                    po.purchase_order_id === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{po.purchase_order_no}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {po.date && (
                                      <span className="text-[10px] text-muted-foreground">{po.date}</span>
                                    )}
                                    {po.inventory_status !== undefined && (
                                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                                        {inventoryStatusLabel[po.inventory_status] ?? `Status ${po.inventory_status}`}
                                      </span>
                                    )}
                                    {po.total_amount != null && (
                                      <span className="text-[10px] text-muted-foreground ml-auto">
                                        ₱{Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Distance (KM)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Stop</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
