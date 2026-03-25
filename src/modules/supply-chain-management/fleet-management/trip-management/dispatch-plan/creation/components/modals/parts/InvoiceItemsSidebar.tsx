"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, ShoppingCart } from "lucide-react";
import { getStatusColor, PlanDetailItem } from "./types";

interface InvoiceItemsSidebarProps {
  selectedPlanIds: number[];
  planDetails: PlanDetailItem[];
  isLoadingDetails: boolean;
  onReorder: (newItems: PlanDetailItem[]) => void;
}

function DraggableInvoiceItem({ order }: { order: PlanDetailItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.detail_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-background text-xs space-y-1.5 transition-shadow",
        isDragging &&
          "shadow-lg ring-1 ring-primary/20 z-10 opacity-50 cursor-grabbing",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-foreground">
            {order.order_no}
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] font-medium uppercase tracking-wide px-1.5 py-0 h-4 rounded border transition-colors",
            getStatusColor(order.order_status),
          )}
        >
          {order.order_status}
        </Badge>
      </div>
      <p className="text-muted-foreground truncate pl-6">
        {order.customer_name}
      </p>
      <div className="flex items-center justify-between pl-6">
        <span className="text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {order.city}
        </span>
        <span className="font-semibold text-foreground tabular-nums">
          ₱
          {Number(order.amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}

export function InvoiceItemsSidebar({
  selectedPlanIds,
  planDetails,
  isLoadingDetails,
  onReorder,
}: InvoiceItemsSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = planDetails.findIndex((i) => i.detail_id === active.id);
      const newIndex = planDetails.findIndex((i) => i.detail_id === over?.id);
      onReorder(arrayMove(planDetails, oldIndex, newIndex));
    }
  }

  return (
    <div className="w-[340px] flex flex-col overflow-hidden bg-muted/20 shrink-0">
      <div className="p-4 border-b border-border/50 bg-background/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          Sales Transactions
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {selectedPlanIds.length > 0
            ? `${planDetails.length} invoice${planDetails.length !== 1 ? "s" : ""} linked`
            : "Select a PDP to view invoices"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {selectedPlanIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
            <ShoppingCart className="w-8 h-8 mb-2" />
            <p className="text-xs text-center px-4">
              Select a plan to see invoices
            </p>
          </div>
        ) : isLoadingDetails ? (
          <div className="space-y-2 p-1">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : planDetails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30 text-center px-4">
            <p className="text-xs">No invoices linked to this plan.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={planDetails.map((o) => o.detail_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5">
                {planDetails.map((order) => (
                  <DraggableInvoiceItem key={order.detail_id} order={order} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
