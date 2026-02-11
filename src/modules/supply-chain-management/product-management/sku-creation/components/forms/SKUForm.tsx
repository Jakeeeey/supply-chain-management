"use client";

import { useEffect } from "react";

import { useForm, useFieldArray } from "react-hook-form";
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
import { Plus, Trash2, Box, Layers, Settings2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";

// --- Sub-components for Optimization ---

interface FormFieldWrapperProps {
  control: any;
  name: string;
  label: string;
  placeholder?: string;
  rowSpan?: number;
  disabled?: boolean;
  type?: "input" | "textarea";
}

const FormFieldWrapper = ({ control, name, label, placeholder, rowSpan = 1, disabled, type = "input" }: FormFieldWrapperProps) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className={rowSpan === 2 ? "md:col-span-2" : ""}>
        <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">{label}</FormLabel>
        <FormControl>
          {type === "textarea" ? (
            <Textarea placeholder={placeholder} {...field} className="min-h-[100px]" disabled={disabled} />
          ) : (
            <Input placeholder={placeholder} {...field} disabled={disabled} />
          )}
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

interface SectionHeaderProps {
  letter: string;
  title: string;
}

const SectionHeader = ({ letter, title }: SectionHeaderProps) => (
  <div className="flex items-center gap-2 mb-4">
    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 bg-primary text-primary-foreground border-none">
      {letter}
    </Badge>
    <h3 className="text-lg font-semibold">{title}</h3>
  </div>
);

// --- Main Component ---

interface SKUFormProps {
  initialData?: SKU;
  masterData: MasterData | null;
  onSubmit: (data: SKU) => Promise<void>;
  loading?: boolean;
}

export function SKUForm({ initialData, masterData, onSubmit, loading }: SKUFormProps) {
  const form = useForm<any>({
    resolver: zodResolver(skuSchema) as any,
    defaultValues: {
      isActive: 0,
      status: "DRAFT",
      inventory_type: "Regular",
      product_name: "",
      description: "",
      short_description: "",
      unit_of_measurement_count: 1,
      barcode: "",
      size: "",
      color: "",
      volume: "",
      flavor: "",
      price_per_unit: 0,
      cost_per_unit: 0,
      units: [],
      ...initialData,
      // Priority overrides for specific IDs
      product_id: initialData?.product_id,
      id: (initialData as any)?.id,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "units",
  });

  const unitsMaster = masterData?.units || [];
  const inventoryType = form.watch("inventory_type");
  const isReadOnly = initialData?.status === "Active" || initialData?.status === "For Approval";

  // Auto-init for new records
  useEffect(() => {
    if (fields.length === 0 && !initialData && unitsMaster.length > 0) {
      const pieceUnit = unitsMaster.find(u => u.name.toLowerCase().includes("piece"));
      if (pieceUnit) {
        append({ unit_id: pieceUnit.id, conversion_factor: 1, price: 0, cost: 0, barcode: "" });
      }
    }
  }, [fields.length, initialData, unitsMaster, append]);

  const renderUnitRow = (fieldItem: any, index: number) => (
    <div key={fieldItem.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-background/50">
      <div className="md:col-span-5">
        <FormField
          control={form.control}
          name={`units.${index}.unit_id`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Unit</FormLabel>
              <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()} disabled={index === 0 && !initialData}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                <SelectContent>{unitsMaster.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="md:col-span-3">
        <FormField
          control={form.control}
          name={`units.${index}.conversion_factor`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Unit Count</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="md:col-span-3 py-2 text-sm font-medium text-primary flex items-center gap-1">
        1 Unit * {form.watch(`units.${index}.conversion_factor`) || 0} = {form.watch(`units.${index}.conversion_factor`) || 0} Base
      </div>
      {index > 0 && (
        <div className="md:col-span-1 flex justify-end">
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <ScrollArea className="h-[75vh] pr-4">
          <div className="max-w-4xl mx-auto space-y-6 pb-10">
            
            {/* Section A: Core info */}
            <Card className="border-accent/20 bg-card/50">
              <CardContent className="pt-6 space-y-6">
                <SectionHeader letter="A" title="Parent Product Information" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormFieldWrapper control={form.control} name="product_name" label="Product Name *" placeholder="e.g. Coca-Cola" rowSpan={2} disabled={isReadOnly} />
                  <FormFieldWrapper control={form.control} name="description" label="Description" placeholder="Specifications..." rowSpan={2} type="textarea" disabled={isReadOnly} />
                  
                  <FormField control={form.control} name="product_brand" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Brand *</FormLabel>
                      <FormControl>
                        <Combobox options={(masterData?.brands || []).map(b => ({ value: b.id.toString(), label: b.name }))} value={field.value?.toString() || ""} onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} placeholder="Select Brand" disabled={isReadOnly} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="product_category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Category *</FormLabel>
                      <FormControl>
                        <Combobox options={(masterData?.categories || []).map(c => ({ value: c.id.toString(), label: c.name }))} value={field.value?.toString() || ""} onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} placeholder="Select Category" disabled={isReadOnly} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="inventory_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Inventory Type</FormLabel>
                      <Tabs defaultValue={field.value} onValueChange={field.onChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="Regular">Regular</TabsTrigger><TabsTrigger value="Variant">Variant</TabsTrigger></TabsList>
                      </Tabs>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="product_supplier" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Supplier</FormLabel>
                      <div className="flex gap-2">
                        <Combobox options={(masterData?.suppliers || []).map(s => ({ value: s.id.toString(), label: s.name }))} value={field.value?.toString() || ""} onValueChange={(v) => field.onChange(v ? parseInt(v) : null)} placeholder="Select Supplier" disabled={isReadOnly} className="flex-1" />
                        <Button type="button" variant="secondary" size="icon"><Plus className="h-4 w-4" /></Button>
                      </div>
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Section B: Units */}
            <Card className="border-accent/20 bg-card/50">
              <CardContent className="pt-6 space-y-6">
                <SectionHeader letter="B" title="Units & Conversion" />
                <div className="space-y-4">
                  {fields.map((fieldItem, index) => renderUnitRow(fieldItem, index))}
                  <Button type="button" variant="outline" onClick={() => append({ unit_id: 0, conversion_factor: 1 })}><Plus className="mr-2 h-4 w-4" /> Add Unit</Button>

                  {fields.length > 0 && (
                    <div className="mt-6 p-4 border rounded-lg bg-accent/5 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Box className="h-4 w-4" /> PREVIEW</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {fields.map((_, idx) => {
                          const unit = unitsMaster.find(u => u.id.toString() === form.watch(`units.${idx}.unit_id`)?.toString());
                          return (
                            <div key={idx} className="p-3 border rounded bg-background">
                              <span className="block text-[10px] font-bold text-primary uppercase">Auto-Generated</span>
                              <span className="text-xs font-medium">{form.watch("product_name") || "Product"} ({unit?.name || "..."})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section C: Variants */}
            {inventoryType === "Variant" && (
              <Card className="border-accent/20 bg-card/50">
                <CardContent className="pt-6 space-y-6">
                  <SectionHeader letter="C" title="Variant Attributes" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormFieldWrapper control={form.control} name="flavor" label="Flavor" placeholder="Vanilla" disabled={isReadOnly} />
                    <FormFieldWrapper control={form.control} name="size" label="Size" placeholder="Medium" disabled={isReadOnly} />
                    <FormFieldWrapper control={form.control} name="color" label="Color" placeholder="Red" disabled={isReadOnly} />
                    <FormFieldWrapper control={form.control} name="volume" label="Volume" placeholder="330ml" disabled={isReadOnly} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={loading}>Reset</Button>
          <Button type="submit" disabled={loading} className="px-10">{loading ? "Processing..." : initialData ? "Update Record" : "Create Draft"}</Button>
        </div>
      </form>
    </Form>
  );
}
