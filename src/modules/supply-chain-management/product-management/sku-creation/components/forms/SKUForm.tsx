"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { skuSchema, SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";

interface SKUFormProps {
  initialData?: SKU;
  masterData: MasterData | null;
  onSubmit: (data: SKU) => Promise<void>;
  loading?: boolean;
}

export function SKUForm({ initialData, masterData, onSubmit, loading }: SKUFormProps) {
  const form = useForm<SKU>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      isActive: initialData?.isActive ?? true,
      status: initialData?.status ?? "Draft",
      inventory_type: initialData?.inventory_type ?? "Regular",
      product_name: initialData?.product_name ?? "",
      description: initialData?.description ?? "",
      short_description: initialData?.short_description ?? "",
      product_id: initialData?.product_id,
      id: (initialData as any)?.id,
      parent_id: initialData?.parent_id ?? null,
      product_brand: initialData?.product_brand ?? null,
      product_category: initialData?.product_category ?? null,
      product_supplier: initialData?.product_supplier ?? null,
      base_unit: initialData?.base_unit ?? null,
      unit_of_measurement: initialData?.unit_of_measurement ?? null,
      unit_of_measurement_count: initialData?.unit_of_measurement_count ?? 1,
      barcode: initialData?.barcode ?? "",
      size: initialData?.size ?? "",
      color: initialData?.color ?? "",
      volume: initialData?.volume ?? "",
      flavor: initialData?.flavor ?? "",
      price_per_unit: initialData?.price_per_unit ?? 0,
      cost_per_unit: initialData?.cost_per_unit ?? 0,
      ...initialData,
    },
  });

  const inventoryType = form.watch("inventory_type");
  const isReadOnly = initialData?.status === "Active" || initialData?.status === "For Approval";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[65vh] pr-4">
          <div className="max-w-2xl mx-auto space-y-8 pb-10">
            {/* Basic Information */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="product_name"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} disabled={isReadOnly} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inventory_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Type <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Regular">Regular Item</SelectItem>
                          <SelectItem value="Variant">Variant Item</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Combobox
                          options={(masterData?.brands || []).map(b => {
                            const fullName = b.name || (b as any).brand || (b as any).brand_name || (b as any).title || (b as any).code || `Brand #${b.id}`;
                            const truncatedName = fullName.length > 20 ? `${fullName.substring(0, 20)}...` : fullName;
                            return {
                              value: b.id.toString(),
                              label: truncatedName,
                              fullLabel: fullName // We can use this for search if we update Combobox
                            };
                          })}
                          value={field.value?.toString() || ""}
                          onValueChange={(v) => field.onChange(v ? parseInt(v) : null)}
                          placeholder="Select brand"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Combobox
                          options={(masterData?.categories || []).map(c => {
                            const fullName = c.name || (c as any).category || (c as any).category_name || (c as any).title || (c as any).code || `Category #${c.id}`;
                            const truncatedName = fullName.length > 12 ? `${fullName.substring(0, 12)}...` : fullName;
                            return {
                              value: c.id.toString(),
                              label: truncatedName,
                              fullLabel: fullName
                            };
                          })}
                          value={field.value?.toString() || ""}
                          onValueChange={(v) => field.onChange(v ? parseInt(v) : null)}
                          placeholder="Select category"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Combobox
                          options={(masterData?.suppliers || []).map(s => {
                            const fullName = s.name || (s as any).supplier_name || (s as any).company_name || (s as any).supplier || `Supplier #${s.id}`;
                            const truncatedName = fullName.length > 12 ? `${fullName.substring(0, 12)}...` : fullName;
                            return {
                              value: s.id.toString(),
                              label: truncatedName,
                              fullLabel: fullName
                            };
                          })}
                          value={field.value?.toString() || ""}
                          onValueChange={(v) => field.onChange(v ? parseInt(v) : null)}
                          placeholder="Select supplier"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
            <Separator />
            {/* Pricing & Description */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight">Pricing & Description</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || 0} 
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || 0} 
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Product specifications and details..." 
                          className="min-h-[120px] w-full" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </div>
        </ScrollArea>
        
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={loading}>
            Reset
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : initialData ? "Update Record" : "Create SKU"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
