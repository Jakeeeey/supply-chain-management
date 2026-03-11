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
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}
        >
            <Card
                onClick={() => onClick(batch)}
                className="cursor-pointer group overflow-hidden border-2 shadow-lg relative border-blue-500/50 bg-blue-500/5 hover:border-blue-500 hover:shadow-blue-500/20 transition-all"
            >
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <Badge variant="outline" className="mb-2 font-black uppercase text-[10px] tracking-widest text-blue-500 border-blue-500/20">
                                Pending Audit
                            </Badge>
                            <h3 className="text-xl font-black uppercase tracking-tighter italic group-hover:text-blue-500 transition-colors">
                                {batch.consolidatorNo}
                            </h3>
                        </div>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="p-3 rounded-xl bg-blue-500/10"
                        >
                            <ShieldAlert className="w-5 h-5 text-blue-500" />
                        </motion.div>
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="text-4xl font-black leading-none italic">{pickedItems}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Items Verified</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black leading-none italic text-muted-foreground/40">/ {totalItems}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};