"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
    AreaChart, 
    Area, 
    XAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts'

const pulseData = [
    { time: '00:00', headcount: 450 },
    { time: '04:00', headcount: 380 },
    { time: '08:00', headcount: 1200 },
    { time: '12:00', headcount: 1450 },
    { time: '16:00', headcount: 1100 },
    { time: '20:00', headcount: 950 },
    { time: '23:59', headcount: 520 },
]

export function WorkforcePulse() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-[10px] font-black font-mono text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] mb-1">Workforce_Shift_Pulse</h4>
                    <p className="text-2xl font-black font-mono text-cyan-500 tracking-tighter italic">2,840 Personnel</p>
                </div>
                <div className="text-right">
                    <span className="text-[8px] font-mono text-slate-500 dark:text-white/20 uppercase block mb-1">Active_Status</span>
                    <div className="flex gap-1 items-center justify-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-black text-cyan-400">NOMINAL</span>
                    </div>
                </div>
            </div>

            {/* Shift Pulse Chart */}
            <div className="h-[180px] w-full -ml-4 pr-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pulseData}>
                        <defs>
                            <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical={false} opacity={0.05} />
                        <XAxis 
                            dataKey="time" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: "#64748b", fontSize: 8, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(2, 6, 23, 0.9)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '10px',
                                color: '#fff'
                            }} 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="headcount" 
                            stroke="#06b6d4" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#cyanGradient)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Punctuality Spectrum */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">
                    <span>Punctuality_Spectrum</span>
                    <span className="text-cyan-500 font-bold">94.2% On-Time Avg</span>
                </div>
                <div className="h-3 w-full bg-slate-500/5 dark:bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-500/10 dark:border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "85%" }}
                        className="h-full bg-cyan-500 rounded-l-full"
                    />
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "10%" }}
                        className="h-full bg-amber-500"
                    />
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "5%" }}
                        className="h-full bg-rose-500 rounded-r-full"
                    />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-500 dark:text-white/20 uppercase">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> On_Time</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Grace_P</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Delayed</span>
                </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-500/10 dark:border-white/5">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/20 uppercase">Core_Department_Load</p>
                    <p className="text-xs font-mono font-black text-slate-400">OPS: 842 // FIN: 112 // SEC: 42</p>
                </div>
            </div>
        </div>
    )
}
