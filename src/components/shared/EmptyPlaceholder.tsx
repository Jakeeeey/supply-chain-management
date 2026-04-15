"use client";

import React from "react";
import { PlusCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyPlaceholderProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: React.ElementType;
}

export function EmptyPlaceholder({
    title = "No matching records",
    description = "We couldn't find any data matching your current view. Try adjusting your filters or adding a new record to the system.",
    actionLabel,
    onAction,
    icon: Icon = Database
}: EmptyPlaceholderProps) {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/10 bg-muted/5 p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-background border transition-transform hover:scale-110 duration-300">
                <Icon className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="mt-6 text-xl font-bold tracking-tight text-foreground/80">
                {title}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    variant="outline"
                    className="mt-6 font-bold hover:bg-primary hover:text-white transition-all border-primary/20"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
