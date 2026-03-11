"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConsolidatorDto } from "../types";

interface BatchCardProps {
    batch: ConsolidatorDto;
    onClick: (batch: ConsolidatorDto) => void;
}

export const BatchCard = ({ batch, onClick }: BatchCardProps) => {
    const totalItems = batch.details?.reduce((sum, d) => sum + (d.orderedQuantity || 0), 0) || 0;
    const pickedItems = batch.details?.reduce((sum, d) => sum + (d.pickedQuantity || 0), 0) || 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.96 }}
            className="w-full"
        >
            <Card
                onClick={() => onClick(batch)}
                className="cursor-pointer group overflow-hidden border-2 shadow-md md:shadow-lg relative border-blue-500/50 bg-blue-500/5 hover:border-blue-500 hover:shadow-blue-500/20 transition-all active:bg-blue-500/10"
            >
                <CardContent className="p-4 md:p-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-4 md:mb-6 gap-2">
                        <div className="flex-1 min-w-0"> {/* 🚀 CRITICAL: min-w-0 allows the title to truncate */}
                            <Badge variant="outline" className="mb-1 md:mb-2 font-black uppercase text-[8px] md:text-[10px] tracking-widest text-blue-500 border-blue-500/20 whitespace-nowrap">
                                Pending Audit
                            </Badge>
                            <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter italic group-hover:text-blue-500 transition-colors truncate block">
                                {batch.consolidatorNo}
                            </h3>
                        </div>

                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="p-2 md:p-3 rounded-lg md:rounded-xl bg-blue-500/10 shrink-0"
                        >
                            <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                        </motion.div>
                    </div>

                    {/* Footer Section (Numbers) */}
                    <div className="flex items-end justify-between gap-2">
                        <div className="space-y-0.5 md:space-y-1 min-w-0">
                            <div className="text-2xl md:text-4xl font-black leading-none italic truncate">
                                {pickedItems}
                            </div>
                            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                Items Verified
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="text-lg md:text-2xl font-black leading-none italic text-muted-foreground/40">
                                / {totalItems}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};