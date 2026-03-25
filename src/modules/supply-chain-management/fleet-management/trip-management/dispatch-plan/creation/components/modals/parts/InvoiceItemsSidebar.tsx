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
  selectedAmount: number;
}

function DraggableInvoiceItem({
  order,
  index,
}: {
  order: PlanDetailItem;
  index: number;
}) {
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
        "flex items-start gap-2 p-3 rounded-lg border border-border/60 bg-background transition-shadow",
        isDragging && "shadow-lg ring-1 ring-border opacity-80",
      )}
    >
      {/* Sequence number */}
      <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0 mt-0.5 tabular-nums">
        {index + 1}
      </span>

      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5 shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-foreground leading-tight">
            {order.customer_name}
          </span>
          <Badge
            variant={
              order.order_status === "Draft"
                ? "outline"
                : order.order_status === "For Loading"
                  ? "default"
                  : "secondary"
            }
            className="text-[9px] h-4 px-1.5 shrink-0"
          >
            {order.order_status}
          </Badge>
        </div>

        <p className="text-[11px] text-muted-foreground font-medium">
          {order.order_no}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {order.city}
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums">
            ₱
            {Number(order.amount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function InvoiceItemsSidebar({
  selectedPlanIds,
  planDetails,
  isLoadingDetails,
  onReorder,
  selectedAmount,
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
    <div className="w-[320px] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          Sales Transactions
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {selectedPlanIds.length > 0
            ? `${planDetails.length} invoice${planDetails.length !== 1 ? "s" : ""} linked`
            : "Select a PDP to view invoices"}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {selectedPlanIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/20 mb-3" />
            <p className="text-xs text-muted-foreground">
              Select a Pre-Dispatch Plan to view linked invoices.
            </p>
          </div>
        ) : isLoadingDetails ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
        ) : planDetails.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-muted-foreground">
              No invoices linked to this plan.
            </p>
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
              <div className="space-y-2">
                {planDetails.map((order, index) => (
                  <DraggableInvoiceItem
                    key={order.detail_id}
                    order={order}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer */}
      {selectedPlanIds.length > 0 && (
        <div className="px-4 py-3 border-t border-border/50 bg-muted/5 shrink-0">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
            Selected Route Value
          </p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-foreground tabular-nums">
              ₱
              {(selectedAmount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <Badge variant="secondary" className="text-[10px] h-5">
              {selectedPlanIds.length} Plan
              {selectedPlanIds.length !== 1 ? "s" : ""} selected
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}