"use client"

import * as React from "react"
import { 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    ResponsiveContainer 
} from 'recharts'

const data = [
    { subject: 'Sec_Risk', A: 120, fullMark: 150 },
    { subject: 'Ops_Lag', A: 98, fullMark: 150 },
    { subject: 'Fin_Gap', A: 86, fullMark: 150 },
    { subject: 'SCM_Bot', A: 99, fullMark: 150 },
    { subject: 'CRM_Churn', A: 110, fullMark: 150 },
]

export function RiskRadar() {
    return (
        <div className="h-[250px] w-full relative">
            <h4 className="absolute top-0 left-0 text-[10px] font-black font-mono text-slate-500 dark:text-white/40 uppercase tracking-[0.2em]">Operational_Risk_Radar</h4>
            
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="55%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#475569" strokeOpacity={0.1} />
                    <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }} 
                    />
                    <Radar
                        name="System Health"
                        dataKey="A"
                        stroke="#d946ef"
                        fill="#d946ef"
                        fillOpacity={0.2}
                    />
                </RadarChart>
            </ResponsiveContainer>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center pt-2 border-t border-slate-500/10 dark:border-white/5">
                <span className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Global_System_Integrity</span>
                <span className="text-xs font-black font-mono text-violet-500 tracking-tighter">94.8%</span>
            </div>
        </div>
    )
}
