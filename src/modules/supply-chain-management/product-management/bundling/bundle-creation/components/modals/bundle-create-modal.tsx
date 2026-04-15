"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  BundleDraftFormValues,
  bundleDraftSchema,
  BundleMasterData,
  BundleType,
  ProductOption,
} from "../../../types/bundle.schema";
import { Combobox } from "../Combobox";

interface BundleCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: BundleDraftFormValues) => Promise<void>;
  masterData: BundleMasterData | null;
  loading?: boolean;
  editDraftId?: number | string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchDetails?: (id: number | string) => Promise<any>;
}

/**
 * Modal for creating or editing a bundle draft.
 * Contains a form with bundle name, type, and a dynamic list of products.
 */
export function BundleCreateModal({
  open,
  onClose,
  onSubmit,
  masterData,
  loading,
  editDraftId,
  fetchDetails,
}: BundleCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Fetch and populate form when in edit mode
  useEffect(() => {
    if (open && editDraftId && fetchDetails) {
      setIsFetchingDetails(true);
      fetchDetails(editDraftId)
        .then((data) => {
          form.reset({
            id: data.id,
            bundle_name: data.bundle_name || "",
            bundle_type_id:
              typeof data.bundle_type_id === "object"
                ? data.bundle_type_id?.id
                : data.bundle_type_id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: data.items?.map((item: any) => ({
              product_id:
                item.product_id?.product_id ||
                item.product_id?.id ||
                item.product_id,
              quantity: Math.floor(Number(item.quantity)) || 1,
            })) || [{ product_id: 0, quantity: 1 }],
          });
        })
        .catch((err) => {
          console.error("Failed to load draft details", err);
        })
        .finally(() => setIsFetchingDetails(false));
    } else if (open && !editDraftId) {
      form.reset({
        bundle_name: "",
        bundle_type_id: 0,
        items: [{ product_id: 0, quantity: 1 }],
      });
    }
  }, [open, editDraftId, fetchDetails, form]);

  const handleSubmit = async (values: BundleDraftFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...values,
        id: editDraftId ? Number(editDraftId) : undefined,
      });
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products: only isActive === 1
  const activeProducts = (masterData?.products || []).filter(
    (p: ProductOption) => p.isActive === 1,
  );

  const items = form.watch("items") || [];
  const totalQuantity = items.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, item: any) => sum + (Number(item.quantity) || 0),
    0,
  );
  const showWarning = items.length === 1 && totalQuantity <= 1;

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />{" "}
            {editDraftId ? "Edit Bundle Draft" : "Create New Bundle"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0 gap-4"
          >
            {isFetchingDetails ? (
              <div className="space-y-6 py-4 animate-in fade-in duration-500">
                <div className="space-y-4 px-6">
                  {/* Bundle Info Section Skeleton */}
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>

                <div className="space-y-4 px-6 pt-4 border-t">
                  {/* Products Section Skeleton */}
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                      <div className="w-16 space-y-2">
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                  ))}
                  <Skeleton className="h-10 w-full rounded-md mt-2" />
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 min-h-0">
                <div>
                  <Card className="border-none shadow-none bg-background">
                    <CardContent className="space-y-4">
                      {/* <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="h-6 w-6 rounded-full flex items-center justify-center p-0 bg-primary text-primary-foreground border-none"
                      >
                        A
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        Bundle Information
                      </h3>
                    </div> */}

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
                                  onValueChange={(v: string) =>
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
                  <Card className="border-none shadow-none bg-background">
                    <CardContent className="space-y-4">
                      {/* <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="h-6 w-6 rounded-full flex items-center justify-center p-0 bg-primary text-primary-foreground border-none"
                      >
                        B
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        Bundled Products
                      </h3>
                    </div> */}

                      <div className="space-y-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                                            label: p.product_code
                                              ? `${p.product_name} - ${p.product_code}`
                                              : p.product_name,
                                          }),
                                        )}
                                        value={field.value?.toString() || ""}
                                        onValueChange={(v: string) =>
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

                            <div className="w-24">
                              <FormItem>
                                <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                                  Unit
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    value={
                                      masterData?.products?.find(
                                        (p) =>
                                          Number(p.product_id) ===
                                          Number(
                                            form.watch(
                                              `items.${index}.product_id`,
                                            ),
                                          ),
                                      )?.unit_name || "-"
                                    }
                                    readOnly
                                    disabled
                                    className="bg-muted font-medium text-xs text-center px-1"
                                  />
                                </FormControl>
                              </FormItem>
                            </div>

                            <div className="w-20 shrink-0">
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
                                        step="1"
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
                          variant="default"
                          onClick={() => append({ product_id: 0, quantity: 1 })}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {showWarning && form.formState.submitCount > 0 && (
                  <Alert variant="destructive" className="bg-background">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Invalid Bundle</AlertTitle>
                    <AlertDescription>
                      A bundle must contain more than one product in total.
                      Please add another product or increase the quantity.
                    </AlertDescription>
                  </Alert>
                )}
              </ScrollArea>
            )}

            <DialogFooter className="shrink-0 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  form.reset();
                  onClose();
                }}
                disabled={isSubmitting || loading || isFetchingDetails}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || loading || isFetchingDetails}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editDraftId ? (
                  "Save Changes"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
