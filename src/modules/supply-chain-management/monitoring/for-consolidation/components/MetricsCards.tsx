import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertCircle, CircleDollarSign } from "lucide-react";
import { ForConsolidationOrder } from "../types";

interface MetricsCardsProps {
    orders: ForConsolidationOrder[];
}

export function MetricsCards({ orders }: MetricsCardsProps) {
    const criticalOrdersCount = orders.filter(o => {
        if (!o.forConsolidationAt) return false;
        const diff = Math.floor((new Date().getTime() - new Date(o.forConsolidationAt).getTime()) / 60000);
        return diff > 240; // Over 4 hours
    }).length;

    const totalValue = orders.reduce((sum, order) => sum + (order.allocatedAmount || 0), 0);

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm border-border/50 transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                    {/* Using Shadcn's semantic primary colors */}
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total in Queue</p>
                        <h3 className="text-2xl font-bold tracking-tight">{orders.length}</h3>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                    {/* Using Shadcn's semantic destructive colors */}
                    <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Critical Age (&gt; 4hrs)</p>
                        <h3 className="text-2xl font-bold tracking-tight text-destructive">{criticalOrdersCount}</h3>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                    {/* Using Tailwind dark variants for the green success color */}
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <CircleDollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Allocated Value</p>
                        <h3 className="text-2xl font-bold tracking-tight">
                            ₱{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}