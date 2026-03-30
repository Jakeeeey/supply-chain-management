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
import { ChevronDown, ChevronUp, GripVertical, MapPin, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddManualStopModal } from "./AddManualStopModal";
import { AddPoStopModal } from "./AddPoStopModal";
import { PlanDetailItem, GroupedPlanDetailItem } from "./types";

interface InvoiceItemsSidebarProps {
  selectedPlanIds: number[];
  planDetails: PlanDetailItem[];
  isLoadingDetails: boolean;
  onReorder: (newItems: PlanDetailItem[]) => void;
  selectedAmount: number;
}

function DraggableGroupedStop({
  stop,
  index,
  onDelete,
}: {
  stop: GroupedPlanDetailItem;
  index: number;
  onDelete: (id: string | number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isManual = stop.isManualStop;
  const isInvoice = !stop.isManualStop && !stop.isPoStop;
  const itemCount = stop.items.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col rounded-lg border border-border/60 bg-background transition-shadow group overflow-hidden",
        isDragging && "shadow-lg ring-1 ring-border opacity-80",
        isManual && "border-primary/20 bg-primary/2"
      )}
    >
      <div className="flex items-start gap-2 p-3">
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
            {stop.isManualStop ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs font-semibold text-foreground leading-tight truncate cursor-default">
                      {stop.remarks}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stop.remarks}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : stop.isPoStop ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <Package className="w-3 h-3 text-amber-600 shrink-0" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs font-semibold text-foreground leading-tight truncate cursor-default">
                      {stop.po_no}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stop.po_no}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-semibold text-foreground leading-tight truncate cursor-default">
                    {stop.customer_name}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stop.customer_name}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <div className="flex flex-col items-end gap-1 shrink-0 translate-y-[-2px]">
              <Badge
                variant={
                  stop.isManualStop || stop.isPoStop
                    ? stop.status?.includes("Fulfilled")
                      ? "default"
                      : "secondary"
                    : stop.status === "Draft"
                      ? "outline"
                      : stop.status === "For Loading"
                        ? "default"
                        : "secondary"
                }
                className="text-[9px] h-4 px-1.5 shrink-0"
              >
                {stop.status || "Not Fulfilled"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-0.5 min-h-[20px]">
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              {stop.isManualStop 
                ? `Manual Route Stop · ${stop.distance || 0} km` 
                : stop.isPoStop 
                  ? `Purchase Order · ${stop.distance || 0} km`
                  : `${itemCount} Invoice${itemCount !== 1 ? "s" : ""}`}
            </p>
            <div className="flex items-center gap-1 shrink-0">
                {isInvoice && itemCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {(stop.isManualStop || stop.isPoStop) && (
                  <button
                    type="button"
                    onClick={() => onDelete(stop.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
            </div>
          </div>

          {isInvoice && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {stop.city}
              </span>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                ₱
                {Number(stop.totalAmount || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded list of items */}
      {isExpanded && isInvoice && (
        <div className="bg-muted/30 border-t border-border/40 px-3 py-2 space-y-1.5">
          {stop.items.map((item) => (
            <div key={item.detail_id} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">{item.order_no}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px] h-3 px-1">
                  {item.order_status}
                </Badge>
                <span className="text-foreground font-semibold">
                  ₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const groupedPlanDetails = useMemo(() => {
    const grouped: GroupedPlanDetailItem[] = [];
    const keyToGroup = new Map<string, GroupedPlanDetailItem>();

    planDetails.forEach((item) => {
      let key: string;
      if (item.isManualStop || item.isPoStop) {
        key = String(item.detail_id);
      } else {
        key = `${item.customer_name}-${item.city}`;
      }

      const existing = keyToGroup.get(key);
      if (existing && !item.isManualStop && !item.isPoStop) {
        existing.items.push(item);
        existing.totalAmount += item.amount;
      } else {
        const newGroup: GroupedPlanDetailItem = {
          id: key,
          items: [item],
          customer_name: item.customer_name,
          city: item.city,
          isManualStop: item.isManualStop,
          isPoStop: item.isPoStop,
          remarks: item.remarks,
          distance: item.distance,
          po_no: item.po_no,
          totalAmount: item.amount,
          status: item.isManualStop || item.isPoStop ? (item.status || "Not Fulfilled") : item.order_status,
        };
        grouped.push(newGroup);
        if (!item.isManualStop && !item.isPoStop) {
          keyToGroup.set(key, newGroup);
        }
      }
    });

    return grouped;
  }, [planDetails]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = groupedPlanDetails.findIndex((i) => i.id === active.id);
      const newIndex = groupedPlanDetails.findIndex((i) => i.id === over?.id);
      
      const newGrouped = arrayMove(groupedPlanDetails, oldIndex, newIndex);
      const flattened = newGrouped.flatMap(g => g.items);
      onReorder(flattened);
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
    onReorder(planDetails.filter((item) => String(item.detail_id) !== String(id)));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-[320px] flex flex-col overflow-hidden shrink-0">
        {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Route Sequence
          </p>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-primary/10 text-primary transition-colors"
                    onClick={() => setIsAddingStop(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add Manual Stop</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-amber-600/10 text-amber-600 transition-colors"
                    onClick={() => setIsAddingPo(true)}
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add PO Stop</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {groupedPlanDetails.length > 0
            ? `${groupedPlanDetails.length} stop${groupedPlanDetails.length !== 1 ? "s" : ""} in route`
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
              items={groupedPlanDetails.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {groupedPlanDetails.map((stop, index) => (
                  <DraggableGroupedStop
                    key={stop.id}
                    stop={stop}
                    index={index}
                    onDelete={handleDeleteStop}
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
    </TooltipProvider>
  );
}
