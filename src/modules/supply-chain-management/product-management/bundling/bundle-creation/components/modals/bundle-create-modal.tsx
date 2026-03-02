"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bundleService } from "../../services/bundle";
import {
  bundleDraftSchema,
  BundleDraftFormValues,
  BundleMasterData,
  ProductOption,
  BundleType,
} from "../../../types/bundle.schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface BundleCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: BundleDraftFormValues) => Promise<void>;
  masterData: BundleMasterData | null;
  loading?: boolean;
}

/**
 * Modal for creating a new bundle draft.
 * Contains a form with bundle name, type, and a dynamic list of products.
 */
export function BundleCreateModal({
  open,
  onClose,
  onSubmit,
  masterData,
  loading,
}: BundleCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(bundleDraftSchema) as any,
    defaultValues: {
      bundle_name: "",
      bundle_type_id: 0,
      items: [{ product_id: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleSubmit = async (values: BundleDraftFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products: only isActive === 1
  const activeProducts = (masterData?.products || []).filter(
    (p: ProductOption) => p.isActive === 1,
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Create New Bundle
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0 gap-6"
          >
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 pr-3">
                <Card className="border-accent/20 bg-card/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="h-6 w-6 rounded-full flex items-center justify-center p-0 bg-primary text-primary-foreground border-none"
                      >
                        A
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        Bundle Information
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="bundle_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                              Bundle Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Snack Combo Pack"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bundle_type_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                              Bundle Type *
                            </FormLabel>
                            <FormControl>
                              <Combobox
                                options={(masterData?.bundleTypes || []).map(
                                  (t: BundleType) => ({
                                    value: t.id.toString(),
                                    label: t.name,
                                  }),
                                )}
                                value={field.value?.toString() || ""}
                                onValueChange={(v) =>
                                  field.onChange(v ? parseInt(v) : 0)
                                }
                                placeholder="Select Bundle Type"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-accent/20 bg-card/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="h-6 w-6 rounded-full flex items-center justify-center p-0 bg-primary text-primary-foreground border-none"
                      >
                        B
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        Bundled Products
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {fields.map((fieldItem: any, index: number) => (
                        <div
                          key={fieldItem.id}
                          className="flex flex-row items-end gap-2 p-3 border rounded-lg bg-background/50"
                        >
                          <div className="flex-1 min-w-0">
                            <FormField
                              control={form.control}
                              name={`items.${index}.product_id`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                                    Product *
                                  </FormLabel>
                                  <FormControl>
                                    <Combobox
                                      options={activeProducts.map(
                                        (p: ProductOption) => ({
                                          value: p.product_id.toString(),
                                          label: `${p.product_name} (${p.product_code})`,
                                        }),
                                      )}
                                      value={field.value?.toString() || ""}
                                      onValueChange={(v) =>
                                        field.onChange(v ? parseInt(v) : 0)
                                      }
                                      placeholder="Select Product"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="w-16 shrink-0">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                                    Qty
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="shrink-0">
                            {fields.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-destructive h-9 w-9"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="h-9 w-9" />
                            )}
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ product_id: 0, quantity: 1 })}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <DialogFooter className="shrink-0 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  form.reset();
                  onClose();
                }}
                disabled={isSubmitting || loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? "Creating..." : "Create Bundle Draft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
