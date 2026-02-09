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
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

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
        <ScrollArea className="h-[65vh] pr-6">
          <div className="space-y-8 pb-4">
            {/* Phase A: Basic Product Information */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold border-primary text-primary">A</Badge>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Basic Product Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="product_name"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter exact product name" {...field} disabled={isReadOnly} />
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
                          <SelectTrigger>
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
                      <FormLabel>Product Brand</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} 
                        value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {masterData?.brands?.filter(b => (b.id != null) || ((b as any).brand_id != null)).map(b => (
                            <SelectItem key={b.id || (b as any).brand_id} value={(b.id || (b as any).brand_id).toString()}>
                              {b.name || (b as any).brand || (b as any).brand_name || (b as any).title || (b as any).code || `Brand #${b.id || (b as any).brand_id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Category <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} 
                        value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {masterData?.categories?.filter(c => (c.id != null) || ((c as any).category_id != null)).map(c => (
                            <SelectItem key={c.id || (c as any).category_id} value={(c.id || (c as any).category_id).toString()}>
                              {c.name || (c as any).category || (c as any).category_name || (c as any).title || (c as any).code || `Category #${c.id || (c as any).category_id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Supplier</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} 
                        value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {masterData?.suppliers?.filter(s => (s.id != null) || ((s as any).supplier_id != null)).map(s => (
                            <SelectItem key={s.id || (s as any).supplier_id} value={(s.id || (s as any).supplier_id).toString()}>
                              {(s as any).name || (s as any).supplier_name || (s as any).company_name || (s as any).supplier || (s as any).contact_name || `Supplier #${s.id || (s as any).supplier_id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator />

            {/* Phase B: Structure and UOM */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 font-bold border-primary text-primary">B</Badge>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {inventoryType === "Regular" ? "Unit & Conversion Structure" : "Variant Attributes & Structure"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="base_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Unit <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} 
                        value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {masterData?.units?.filter(u => (u.id != null) || ((u as any).unit_id != null)).map(u => (
                            <SelectItem key={u.id || (u as any).unit_id} value={(u.id || (u as any).unit_id).toString()}>
                              {u.name || (u as any).unit || (u as any).unit_name || (u as any).code || `Unit #${u.id || (u as any).unit_id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_of_measurement_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversion Count</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 24" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          value={field.value || 1}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>1 Unit = X Base Units</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode / QR mapping</FormLabel>
                      <FormControl>
                        <Input placeholder="Scan or type barcode" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {inventoryType === "Variant" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/40 p-4 rounded-lg border border-dashed">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Size</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-xs" placeholder="e.g. 500ml" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Color</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-xs" placeholder="e.g. Red" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Volume</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-xs" placeholder="e.g. 1L" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flavor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Flavor</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-xs" placeholder="e.g. Cheese" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </section>

            <Separator />

            {/* Additional Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Commercial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Selling Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || 0} 
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
                      <FormLabel>Estimated Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || 0} 
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
                    <FormItem className="col-span-2">
                    <FormLabel>Product Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed product specifications..." 
                        className="min-h-[100px] resize-none" 
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
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground italic">
            {isReadOnly ? "Some fields are locked post-submission" : "Changes will be saved as Draft"}
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="px-8 shadow-sm">
              {loading ? "Saving..." : initialData ? "Update Record" : "Save as Draft"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
