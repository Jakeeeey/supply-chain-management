"use client";

import React, { useState, useEffect } from "react";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { PAPER_SIZES } from "@/components/pdf-layout-design/constants";
import { CompanyData } from "@/components/pdf-layout-design/types";
import { PdfTemplate, pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";
import { FileText, Printer, X, Layout } from "lucide-react";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const mockEmployees = [
    { id: "EMP-001", name: "John Doe", position: "Software Engineer", department: "IT", status: "Active" },
    { id: "EMP-002", name: "Jane Smith", position: "Product Manager", department: "Product", status: "Active" },
    { id: "EMP-003", name: "Bob Johnson", position: "UI/UX Designer", department: "Design", status: "On Leave" },
    { id: "EMP-004", name: "Alice Brown", position: "QA Engineer", department: "IT", status: "Active" },
    { id: "EMP-005", name: "Charlie Wilson", position: "HR Manager", department: "HR", status: "Active" },
];

export default function PdfTestPage() {
    const [templates, setTemplates] = useState<PdfTemplate[]>([]);
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                // SWR Style: Load from cache first
                const cached = localStorage.getItem('pdf_company_data');
                if (cached) setCompanyData(JSON.parse(cached));

                // Fetch Company Data and Templates in parallel
                const [compRes, tpls] = await Promise.all([
                    fetch("/api/pdf/company"),
                    pdfTemplateService.fetchTemplates()
                ]);

                if (compRes.ok) {
                    const result = await compRes.json();
                    const company = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
                    setCompanyData(company);
                    if (company) localStorage.setItem('pdf_company_data', JSON.stringify(company));
                }

                setTemplates(tpls);
                if (tpls.length > 0) {
                    setSelectedTemplateName(tpls[0].name);
                }
            } catch (error) {
                console.error("Error fetching data:", error); // Changed error message to be more general
            }
        };
        init();
    }, []);

    const handlePrint = async () => {
        if (!selectedTemplateName) {
            toast.warning("Please select a template first.");
            return;
        }

        setIsGenerating(true);
        try {
            // Ensure we have company data from API
            if (!companyData) {
                toast.warning("Company data not loaded yet. Please wait.");
                setIsGenerating(false);
                return;
            }

            const doc = await PdfEngine.generateWithFrame(selectedTemplateName, companyData, (doc, startY, config) => {
                const margins = config.margins || { top: 10, bottom: 10, left: 10, right: 10 };
                
                // Calculate dynamic bottom margin based on Body End indicator
                const baseSize = config.paperSize === 'Custom' ? config.customSize : (PAPER_SIZES[config.paperSize] || PAPER_SIZES.A4);
                const paperHeight = config.orientation === 'landscape' ? baseSize.width : baseSize.height;
                const bottomMargin = config.bodyEnd ? (paperHeight - config.bodyEnd) : margins.bottom;

                // 100% Accurate Title Placement (Using Top Baseline)
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("EMPLOYEE MASTERLIST", margins.left, startY, { baseline: 'top' });

                // Start table just below the title (title is roughly 5mm high at 12pt)
                autoTable(doc, {
                    startY: startY + 8,
                    margin: { ...margins, bottom: bottomMargin },
                    head: [['ID', 'Name', 'Position', 'Department', 'Status']],
                    body: mockEmployees.map(emp => [emp.id, emp.name, emp.position, emp.department, emp.status]),
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                    styles: { fontSize: 8 }
                });
            });

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setIsPreviewOpen(true);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen bg-slate-50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Layout className="text-blue-600" size={32} />
                        PDF Engine Test Module
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Testing cross-module reusability with shared templates.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Layout</label>
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none min-w-[200px]"
                            value={selectedTemplateName}
                            onChange={(e) => setSelectedTemplateName(e.target.value)}
                        >
                            {templates.length === 0 && <option>No templates found</option>}
                            {templates.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={handlePrint}
                        disabled={isGenerating || !companyData}
                        className={`mt-auto flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg
                            ${isGenerating ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'}`}
                    >
                        {isGenerating ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : <Printer size={18} />}
                        Generate PDF
                    </button>
                </div>
            </div>

            {/* Sample UI Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-slate-400" size={20} />
                        Employees Data (Module UI)
                    </h2>
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {mockEmployees.length} Records
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b">ID</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b">Name</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b">Position</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b">Department</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {mockEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-sm font-mono text-slate-600">{emp.id}</td>
                                    <td className="p-4 text-sm font-bold text-slate-800">{emp.name}</td>
                                    <td className="p-4 text-sm text-slate-500">{emp.position}</td>
                                    <td className="p-4 text-sm text-slate-500">{emp.department}</td>
                                    <td className="p-4 text-sm text-center">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter ${
                                            emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">
                        * Clicking &quot;Generate PDF&quot; will use the selected Template from the Database as a Header and render this table as the Body.
                    </p>
                </div>
            </div>

            {/* Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-6xl h-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Print Preview</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">Template: <span className="text-blue-600 font-bold">{selectedTemplateName}</span></p>
                            </div>
                            <button 
                                onClick={() => setIsPreviewOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-red-500"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 p-8 flex items-center justify-center relative">
                            {pdfUrl ? (
                                <iframe 
                                    src={pdfUrl} 
                                    className="w-full h-full rounded-2xl border border-slate-200 shadow-xl bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="animate-pulse flex flex-col items-center gap-4">
                                    <div className="h-20 w-20 bg-slate-200 rounded-full"></div>
                                    <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
