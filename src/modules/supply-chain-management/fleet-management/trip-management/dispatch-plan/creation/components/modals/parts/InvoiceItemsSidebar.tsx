import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { GripVertical, MapPin, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { AddManualStopModal } from "./AddManualStopModal";
import { AddPoStopModal } from "./AddPoStopModal";
import { PlanDetailItem } from "./types";

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
  onDelete,
  onEdit,
}: {
  order: PlanDetailItem;
  index: number;
  onDelete: (id: string | number) => void;
  onEdit: (order: PlanDetailItem) => void;
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

  const isManual = order.isManualStop;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 p-3 rounded-lg border border-border/60 bg-background transition-shadow group",
        isDragging && "shadow-lg ring-1 ring-border opacity-80",
        isManual && "border-primary/20 bg-primary/2"
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
          {order.isManualStop ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground leading-tight truncate">
                {order.remarks}
              </span>
            </div>
          ) : order.isPoStop ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-foreground leading-tight truncate">
                {order.po_no}
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-foreground leading-tight truncate">
              {order.customer_name}
            </span>
          )}
          
          <div className="flex flex-col items-end gap-1 shrink-0 translate-y-[-2px]">
            <Badge
              variant={
                order.isManualStop || order.isPoStop
                  ? order.status?.includes("Fulfilled")
                    ? "default"
                    : "secondary"
                  : order.order_status === "Draft"
                    ? "outline"
                    : order.order_status === "For Loading"
                      ? "default"
                      : "secondary"
              }
              className="text-[9px] h-4 px-1.5 shrink-0"
            >
              {order.isManualStop || order.isPoStop 
                ? order.status || "Not Fulfilled" 
                : order.order_status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5 min-h-[20px]">
          <p className="text-[11px] text-muted-foreground font-medium truncate">
            {order.isManualStop 
              ? `Manual Route Stop · ${order.distance || 0} km` 
              : order.isPoStop 
                ? `Purchase Order · ${order.distance || 0} km`
                : order.order_no}
          </p>
          {(order.isManualStop || order.isPoStop) && (
            <button
              type="button"
              onClick={() => onDelete(order.detail_id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-destructive transition-all shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {!order.isManualStop && !order.isPoStop && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
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
        )}
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
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [isAddingPo, setIsAddingPo] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
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

  const handleAddStop = (stop: { remarks: string; distance: number }) => {
    const newStop: PlanDetailItem = {
      detail_id: `manual-${Date.now()}`,
      amount: 0,
      isManualStop: true,
      remarks: stop.remarks,
      distance: stop.distance,
      status: "Not Fulfilled",
    };
    onReorder([...planDetails, newStop]);
  };

  const handleAddPoStop = (stop: { po_id: number; po_no: string; distance: number }) => {
    const newStop: PlanDetailItem = {
      detail_id: `po-${stop.po_id}-${Date.now()}`,
      amount: 0,
      isPoStop: true,
      po_id: stop.po_id,
      po_no: stop.po_no,
      distance: stop.distance,
      status: "Not Fulfilled",
    };
    onReorder([...planDetails, newStop]);
  };

  const handleDeleteStop = (id: string | number) => {
    onReorder(planDetails.filter((item) => item.detail_id !== id));
  };

  return (
    <div className="w-[320px] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Route Sequence
          </p>
          <div className="flex items-center gap-1">
            {isReordering ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] border-primary text-primary bg-primary/5"
                onClick={() => setIsReordering(false)}
              >
                Done
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setIsReordering(true)}
              >
                Reorder
              </Button>
            )}
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Add Manual Stop"
                className="h-7 w-7 rounded-md hover:bg-primary/10 text-primary transition-colors"
                onClick={() => setIsAddingStop(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Add PO Stop"
                className="h-7 w-7 rounded-md hover:bg-amber-600/10 text-amber-600 transition-colors"
                onClick={() => setIsAddingPo(true)}
              >
                <Package className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {planDetails.length > 0
            ? `${planDetails.length} stop${planDetails.length !== 1 ? "s" : ""} in route`
            : "No stops added yet."}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {selectedPlanIds.length === 0 && planDetails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/20 mb-3" />
            <p className="text-xs text-muted-foreground px-4">
              Select a Pre-Dispatch Plan or add a manual stop to build your route.
            </p>
          </div>
        ) : isLoadingDetails ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
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
                    onDelete={handleDeleteStop}
                    onEdit={() => {}} // TODO: implement edit if needed
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer */}
      {(selectedPlanIds.length > 0 || planDetails.length > 0) && (
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
              {planDetails.filter(i => !i.isManualStop).length} Invoice(s)
            </Badge>
          </div>
        </div>
      )}

      <AddManualStopModal
        open={isAddingStop}
        onOpenChange={setIsAddingStop}
        onAdd={handleAddStop}
      />

      <AddPoStopModal
        open={isAddingPo}
        onOpenChange={setIsAddingPo}
        onAdd={handleAddPoStop}
      />
    </div>
  );
}
