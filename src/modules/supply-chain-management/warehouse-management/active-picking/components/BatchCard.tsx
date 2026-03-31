"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConsolidatorDto } from "../types";
import { cn } from "@/lib/utils";

interface BatchCardProps {
    batch: ConsolidatorDto;
    onClick: (batch: ConsolidatorDto) => void;
}

export const BatchCard = ({ batch, onClick }: BatchCardProps) => {
    const totalItems = batch.details?.reduce((sum, d) => sum + (d.orderedQuantity || 0), 0) || 0;
    const pickedItems = batch.details?.reduce((sum, d) => sum + (d.pickedQuantity || 0), 0) || 0;
    const isComplete = pickedItems >= totalItems && totalItems > 0;
    const progress = totalItems > 0 ? (pickedItems / totalItems) * 100 : 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
        >
            <Card
                onClick={() => onClick(batch)}
                className={cn(
                    "cursor-pointer group overflow-hidden border-2 shadow-lg relative",
                    isComplete ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/50 bg-card hover:border-primary/50"
                )}
            >
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "mb-2 font-black uppercase text-[10px] tracking-widest",
                                    isComplete ? "text-emerald-500 border-emerald-500/20" : "text-primary border-primary/20"
                                )}
                            >
                                {isComplete ? "Ready for Audit" : "Active Picking"}
                            </Badge>
                            <h3 className="text-xl font-black uppercase tracking-tighter italic group-hover:text-primary transition-colors">
                                {batch.consolidatorNo}
                            </h3>
                        </div>
                        <motion.div
                            animate={isComplete ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={cn(
                                "p-3 rounded-xl",
                                isComplete ? "bg-emerald-500/10" : "bg-primary/10"
                            )}
                        >
                            <ArrowRight
                                className={cn(
                                    "w-5 h-5",
                                    isComplete ? "text-emerald-500" : "text-primary"
                                )}
                            />
                        </motion.div>
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-4xl font-black leading-none italic"
                            >
                                {pickedItems}
                            </motion.div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Items Picked
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black leading-none italic text-muted-foreground/40">
                                / {totalItems}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Total Goal
                            </div>
                        </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                                "h-full",
                                isComplete ? "bg-emerald-500" : "bg-primary"
                            )}
                        />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};