import { 
    Users, 
    Database, 
    Globe, 
    BarChart3, 
    Shield, 
    Box 
} from "lucide-react"
import { Subsystem } from "../types/subsystems"

export const SUBSYSTEMS: Subsystem[] = [
    {
        id: "HRM",
        title: "Human Resource Management",
        accent: "cyan",
        icon: Users,
        description: "The central repository for personnel and workforce data, managed for operational efficiency and compliance. Covers the entire employee lifecycle—from recruitment to daily clock-ins and complex payroll disbursements.",
        entities: ["Employee (ID, Dept, Position)", "AttendanceRecord (DeviceID, Status)", "Schedule (Rotation, Duration)"],
        analytics: ["Headcount Dynamics (Turnover)", "Punctuality Index", "Labor Cost Distribution"],
        stats: [
            { label: "Total Headcount", value: "2,840", trend: "+12%" },
            { label: "Active Shift", value: "842 Personnel", trend: "NOMINAL" },
            { label: "Punctuality Rate", value: "94.2%", trend: "STABLE" }
        ]
    },
    {
        id: "FIN",
        title: "Financial Management",
        accent: "emerald",
        icon: Database,
        description: "High-precision fiscal orchestration and asset lifecycle monitoring. Transforms operational activities into verifiable financial statements while providing real-time economic vitality metrics.",
        entities: ["Asset (Condition, LifeSpan)", "TreasuryData (Liquidity, Burn)", "AccountingEntry (GLAccount, Debit/Credit)"],
        analytics: ["Liquidity Ratio", "Asset Depreciation Tracking", "Spend Velocity (Daily Burn)"],
        stats: [
            { label: "Available Liquidity", value: "₱4.24M", trend: "OPTIMAL" },
            { label: "Daily Burn Velocity", value: "-₱14.2K", trend: "-2%" },
            { label: "Fixed Assets", value: "842 Nodes" }
        ]
    },
    {
        id: "SCM",
        title: "Supply Chain Management",
        accent: "amber",
        icon: Box,
        description: "The orchestration layer for inventory, logistics, and vendor relationships. Ensures operational continuity through rigorous stock controls and logistics dispatch telemetry.",
        entities: ["Product (SKU, ReorderPoint)", "PurchaseOrder (Supplier, Status)", "LogisticsShipment (TruckID, Route)"],
        analytics: ["Inventory Turnover", "Supplier Fulfillment Rate", "Fleet Fuel Efficiency"],
        stats: [
            { label: "Inventory Accuracy", value: "97.4%", trend: "+1.2%" },
            { label: "Fleet Active", value: "14/15", trend: "+1" },
            { label: "Turnover Rate", value: "14.2X" }
        ]
    },
    {
        id: "CRM",
        title: "Customer Relationship",
        accent: "indigo",
        icon: Globe,
        description: "Driving the revenue pipeline through managed customer interactions and streamlined billing workflows. Focuses on maintaining high service levels while managing complex receivable lifecycles.",
        entities: ["Customer (TIN, CreditLimit)", "SalesOrder (OrderID, Status)", "Invoice (NetAmount, Discount)"],
        analytics: ["Receivables Aging (30/60/90+)", "Invoice Conversion Rate", "Client Retention Index"],
        stats: [
            { label: "Active Clients", value: "3,204", trend: "+84" },
            { label: "Invoice Conversion", value: "94.2%", trend: "HIGH" },
            { label: "Recycled Orders", value: "12%" }
        ]
    },
    {
        id: "BI",
        title: "Business Intelligence",
        accent: "violet",
        icon: BarChart3,
        description: "The 'Brain' of the ecosystem, aggregating data from all modules for strategic decision-making. Correlates cross-domain trends to identify bottleneck risks before they impact the bottom line.",
        entities: ["Cross-Domain Trends", "Strategic KPIs", "Management Heatmaps"],
        analytics: ["Profitability Margins", "Operational Risk Forecasting", "Global System Health Score"],
        stats: [
            { label: "System Integrity", value: "94.8%", trend: "SECURE" },
            { label: "Data Throughput", value: "1.2TB", trend: "NOMINAL" },
            { label: "Risk Mitigation", value: "FAST" }
        ]
    },
    {
        id: "ARF",
        title: "Audit & Findings",
        accent: "rose",
        icon: Shield,
        description: "The assurance layer ensuring transparency and compliance. Maintains non-repudiable logs of sensitive actions and tracks remediation of compliance gaps discovered during audits.",
        entities: ["AuditLog (UserID, ActionType)", "Finding (Description, Severity)", "ComplianceCheckpoint"],
        analytics: ["Compliance Health Score", "Risk Remediation Velocity", "Audit Trail Coverage"],
        stats: [
            { label: "Compliance Health", value: "99.8%", trend: "+0.3%" },
            { label: "Open Findings", value: "3 Minor", trend: "LOW" },
            { label: "Audit Gap Velocity", value: "0.1s" }
        ]
    }
]
