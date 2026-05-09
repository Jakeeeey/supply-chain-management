import { LucideIcon } from "lucide-react"

export interface SubsystemStats {
    label: string
    value: string
    trend?: string
}

export interface Subsystem {
    id: string
    title: string
    accent: "cyan" | "indigo" | "rose" | "emerald" | "amber" | "violet"
    icon: LucideIcon
    description: string
    entities: string[]
    analytics: string[]
    stats: SubsystemStats[]
}
