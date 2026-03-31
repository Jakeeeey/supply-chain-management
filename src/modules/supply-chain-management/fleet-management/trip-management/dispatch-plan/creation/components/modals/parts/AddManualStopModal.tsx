"use client";

import { Button } from "@/components/ui/button";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const manualStopSchema = z.object({
  remarks: z.string().min(1, "Location/Remarks is required"),
  distance: z.number().min(0, "Distance must be non-negative"),
});

type ManualStopValues = z.infer<typeof manualStopSchema>;

interface AddManualStopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (stop: { remarks: string; distance: number }) => void;
  editStop?: { remarks: string; distance: number };
}

export function AddManualStopModal({
  open,
  onOpenChange,
  onAdd,
  editStop,
}: AddManualStopModalProps) {
  const form = useForm<ManualStopValues>({
    resolver: zodResolver(manualStopSchema),
    defaultValues: {
      remarks: "",
      distance: 0,
    },
  });

  // Re-sync form when editStop changes or modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        remarks: editStop?.remarks || "",
        distance: editStop?.distance || 0,
      });
    }
  }, [open, editStop, form]);

  const onSubmit = (values: ManualStopValues) => {
    onAdd(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <DialogTitle>
              {editStop ? "Edit Manual Stop" : "Add Manual Stop"}
            </DialogTitle>
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
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Branch B, Gas Station, etc."
                      {...field}
                    />
                  </FormControl>
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
              <Button type="submit">
                {editStop ? "Save Changes" : "Add Stop"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
