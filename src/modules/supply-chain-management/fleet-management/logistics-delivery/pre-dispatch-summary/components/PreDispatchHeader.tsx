"use client";

import React, {useState, useEffect} from "react";
import {Search, FileText, Download, CheckSquare} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {GroupedDispatchData} from "../types";
import {generateManifestPDF} from "../utils/pdfUtils";

interface Props {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    activeStatus: string;
    groupedData: GroupedDispatchData;
    availableDispatchNos: string[];
}

export function PreDispatchHeader({
                                      searchQuery,
                                      setSearchQuery,
                                      activeStatus,
                                      groupedData,
                                      availableDispatchNos
                                  }: Props) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNos, setSelectedNos] = useState<string[]>([]);

    // Automatically check all boxes when the modal opens or data changes
    useEffect(() => {
        setSelectedNos(availableDispatchNos);
    }, [availableDispatchNos]);

    const handleDownload = () => {
        if (selectedNos.length === 0) return;
        setIsGenerating(true);

        // 🚀 FILTER THE DATA: Only pass the selected Dispatch Numbers to the PDF generator
        const filteredData: GroupedDispatchData = {};
        selectedNos.forEach(no => {
            if (groupedData[no]) {
                filteredData[no] = groupedData[no];
            }
        });

        // Small timeout so the "Generating..." text renders before the PDF freezes the thread
        setTimeout(() => {
            generateManifestPDF(filteredData, activeStatus);
            setIsGenerating(false);
            setIsModalOpen(false); // Close modal on success
        }, 100);
    };

    const isAllSelected = selectedNos.length === availableDispatchNos.length && availableDispatchNos.length > 0;

    return (
        <>
            <div
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border/40 shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter flex items-center gap-2 sm:gap-3">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500"/>
                        Pre-Dispatch Summary
                    </h1>
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        Daily Logistics & Manpower Routing
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <Input
                            placeholder="Search Driver or Outlet..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 rounded-xl font-bold bg-muted/50"
                        />
                    </div>

                    {/* 🚀 Opens the Modal instead of downloading immediately */}
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        disabled={availableDispatchNos.length === 0}
                        className="rounded-xl font-black uppercase tracking-widest text-xs hidden sm:flex shrink-0 shadow-md transition-all"
                    >
                        <CheckSquare className="mr-2 h-4 w-4"/> Select & Print
                    </Button>
                </div>
            </div>

            {/* 🚀 CUSTOM PRINT SELECTION MODAL */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div
                        className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col">

                        <div className="p-6 border-b border-border/40 bg-muted/30">
                            <h2 className="text-xl font-black uppercase tracking-tighter text-foreground">Select Plans
                                to Print</h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">
                                {activeStatus} BATCH
                            </p>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto space-y-3 bg-card">
                            {/* SELECT ALL TOGGLE */}
                            <label
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedNos(availableDispatchNos);
                                        else setSelectedNos([]);
                                    }}
                                    className="w-5 h-5 rounded-md accent-primary cursor-pointer"
                                />
                                <span className="font-black uppercase text-sm tracking-widest">Select All</span>
                            </label>

                            <div className="h-px w-full bg-border/50 my-2"/>

                            {/* INDIVIDUAL DISPATCH TOGGLES */}
                            {availableDispatchNos.map(no => (
                                <label key={no}
                                       className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50 hover:border-primary/50 cursor-pointer shadow-sm transition-all group">
                                    <input
                                        type="checkbox"
                                        checked={selectedNos.includes(no)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedNos(prev => [...prev, no]);
                                            else setSelectedNos(prev => prev.filter(n => n !== no));
                                        }}
                                        className="w-5 h-5 rounded-md accent-primary cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span
                                            className="font-bold text-sm uppercase tracking-widest group-hover:text-primary transition-colors">{no}</span>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* MODAL ACTIONS */}
                        <div className="p-4 border-t border-border/40 bg-muted/20 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-xl font-bold border-border/60 hover:bg-muted/50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDownload}
                                disabled={isGenerating || selectedNos.length === 0}
                                className="rounded-xl font-black uppercase tracking-widest shadow-md"
                            >
                                <Download className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-bounce' : ''}`}/>
                                {isGenerating ? "Generating..." : `Generate PDF (${selectedNos.length})`}
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}