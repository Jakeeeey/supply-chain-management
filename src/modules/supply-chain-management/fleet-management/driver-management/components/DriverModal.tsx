"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveDriver, updateDriver, uploadDriverLicenseFile } from "../providers/fetchProvider";
import { parseLicenseText } from "../utils/ocrParser";
import type { DriverWithDetails, User, Branch } from "../types";
import { Camera, CheckCircle2, Sparkles, UploadCloud, AlertCircle } from "lucide-react";
import { createWorker } from "tesseract.js";

interface DriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingDriver: DriverWithDetails | null;
    users: User[];
    branches: Branch[];
    drivers: DriverWithDetails[];
    onSuccess: () => void;
    driverContactFieldsSupported: boolean;
}

type ContactForm = {
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    emergency_contact_name: string;
    emergency_contact_relationship: string;
    emergency_contact_phone: string;
    emergency_contact_address: string;
};

type LicenseForm = {
    license_no: string;
    license_classification: string;
    license_restrictions: string;
    license_expiry_date: string;
    license_file_record_id: number | null;
    license_verified_by: number | null;
    license_verified_at: string | null;
};

const EMPTY_CONTACT_FORM: ContactForm = {
    contact_phone: "",
    contact_email: "",
    contact_address: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    emergency_contact_address: "",
};

const EMPTY_LICENSE_FORM: LicenseForm = {
    license_no: "",
    license_classification: "Professional",
    license_restrictions: "1, 2",
    license_expiry_date: "",
    license_file_record_id: null,
    license_verified_by: null,
    license_verified_at: null,
};

function hasValidOptionalEmail(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function DriverModal({
    isOpen,
    onClose,
    editingDriver,
    users,
    branches,
    drivers,
    onSuccess,
    driverContactFieldsSupported,
}: DriverModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [isOcrProcessing, setIsOcrProcessing] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string>("");
    const [selectedGoodBranchId, setSelectedGoodBranchId] = React.useState<string>("");
    const [selectedBadBranchId, setSelectedBadBranchId] = React.useState<string>("");
    const [contactForm, setContactForm] = React.useState<ContactForm>(EMPTY_CONTACT_FORM);
    const [licenseForm, setLicenseForm] = React.useState<LicenseForm>(EMPTY_LICENSE_FORM);

    // OCR Capture State
    const [scannedFile, setScannedFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [ocrRawText, setOcrRawText] = React.useState<string>("");
    const [ocrProgress, setOcrProgress] = React.useState<number>(0);
    const [ocrStatusText, setOcrStatusText] = React.useState<string>("");
    const [showRawOcrInput, setShowRawOcrInput] = React.useState(false);
    const [isVerified, setIsVerified] = React.useState<boolean>(false);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [userOpen, setUserOpen] = React.useState(false);
    const [goodBranchOpen, setGoodBranchOpen] = React.useState(false);
    const [badBranchOpen, setBadBranchOpen] = React.useState(false);

    // Filter branches: good branches have isReturn = 0
    const goodBranches = React.useMemo(() => {
        return branches.filter((b) => b.isReturn === 0 || b.isReturn === false);
    }, [branches]);

    // Filter branches: bad branches have isReturn = 1
    const badBranches = React.useMemo(() => {
        return branches.filter((b) => b.isReturn === 1 || b.isReturn === true);
    }, [branches]);

    // Handle good branch selection change
    const onGoodBranchChange = (value: string) => {
        setSelectedGoodBranchId(value);
        setGoodBranchOpen(false);

        // Find the selected good branch details
        const selectedGoodBranch = goodBranches.find(b => b.id.toString() === value);
        if (selectedGoodBranch) {
            const goodName = selectedGoodBranch.branch_name.toLowerCase();
            
            // Try to find a bad branch with a similar name
            const suggestion = badBranches.find(bb => {
                const badName = bb.branch_name.toLowerCase();
                return badName.includes(goodName) || goodName.includes(badName);
            });

            if (suggestion) {
                setSelectedBadBranchId(suggestion.id.toString());
            } else {
                setSelectedBadBranchId("none");
            }
        }
    };

    // Initialize form with editing driver data
    React.useEffect(() => {
        if (editingDriver) {
            setSelectedUserId(editingDriver.user_id.toString());
            setSelectedGoodBranchId(editingDriver.branch_id.toString());
            setSelectedBadBranchId(editingDriver.bad_branch_id?.toString() || "none");
            setContactForm({
                contact_phone: editingDriver.contact_phone || "",
                contact_email: editingDriver.contact_email || "",
                contact_address: editingDriver.contact_address || "",
                emergency_contact_name: editingDriver.emergency_contact_name || "",
                emergency_contact_relationship: editingDriver.emergency_contact_relationship || "",
                emergency_contact_phone: editingDriver.emergency_contact_phone || "",
                emergency_contact_address: editingDriver.emergency_contact_address || "",
            });
            setLicenseForm({
                license_no: editingDriver.license_no || "",
                license_classification: editingDriver.license_classification || "Professional",
                license_restrictions: editingDriver.license_restrictions || "1, 2",
                license_expiry_date: editingDriver.license_expiry_date ? editingDriver.license_expiry_date.split("T")[0] : "",
                license_file_record_id: editingDriver.license_file_record_id || null,
                license_verified_by: editingDriver.license_verified_by || null,
                license_verified_at: editingDriver.license_verified_at || null,
            });
            setIsVerified(!!editingDriver.license_verified_by);
            if (editingDriver.license_file_record?.file_ref) {
                const directusBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
                setPreviewUrl(`${directusBase}/assets/${editingDriver.license_file_record.file_ref}`);
            } else {
                setPreviewUrl(null);
            }
            setScannedFile(null);
            setOcrRawText("");
        } else {
            setSelectedUserId("");
            setSelectedGoodBranchId("");
            setSelectedBadBranchId("none");
            setContactForm(EMPTY_CONTACT_FORM);
            setLicenseForm(EMPTY_LICENSE_FORM);
            setScannedFile(null);
            setPreviewUrl(null);
            setOcrRawText("");
            setIsVerified(false);
        }
    }, [editingDriver, isOpen]);

    const updateContactField = (field: keyof ContactForm, value: string) => {
        setContactForm((prev) => ({ ...prev, [field]: value }));
    };

    const updateLicenseField = (field: keyof LicenseForm, value: string | number | null) => {
        setLicenseForm((prev) => ({ ...prev, [field]: value }));
    };

    // Normalize license string for reliable comparison
    const normalizeLicense = (lic?: string | null) => {
        return (lic || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    };

    // Find conflicting driver if license number is already assigned to someone else
    const conflictingDriver = React.useMemo(() => {
        const currentLic = normalizeLicense(licenseForm.license_no);
        if (!currentLic) return null;

        return drivers.find((d) => {
            if (editingDriver && d.id === editingDriver.id) return false;
            return normalizeLicense(d.license_no) === currentLic;
        }) || null;
    }, [drivers, licenseForm.license_no, editingDriver]);

    // Memoize user options - exclude already assigned users unless editing
    const userOptions = React.useMemo((): { value: string; label: string }[] => {
        const assignedUserIds = new Set(drivers.map((d) => d.user_id));
        return users
            .filter((user) => !assignedUserIds.has(user.user_id) || (editingDriver?.user_id === user.user_id))
            .map((user) => ({
                user,
                value: user.user_id.toString(),
                label: `${user.user_fname} ${user.user_lname}`,
            }));
    }, [users, drivers, editingDriver?.user_id]);

    // Handle File Capture / Upload using Tesseract.js
    const handleCaptureLicense = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScannedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setIsOcrProcessing(true);
        setOcrProgress(0);
        setOcrStatusText("Initializing OCR engine...");

        let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
        try {
            worker = await createWorker("eng", 1, {
                logger: (m) => {
                    if (m.status === "recognizing text") {
                        setOcrProgress(Math.round(m.progress * 100));
                        setOcrStatusText(`Reading text... ${Math.round(m.progress * 100)}%`);
                    } else if (m.status) {
                        setOcrStatusText(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
                    }
                },
            });

            const ret = await worker.recognize(file);
            const extractedText = ret.data.text || "";

            setOcrRawText(extractedText);
            const parsed = parseLicenseText(extractedText);

            setLicenseForm((prev) => ({
                ...prev,
                license_no: parsed.license_no || prev.license_no,
                license_classification: parsed.license_classification || prev.license_classification,
                license_restrictions: parsed.license_restrictions || prev.license_restrictions,
                license_expiry_date: parsed.license_expiry_date || prev.license_expiry_date,
            }));

            // Autofill contact info if found and not yet filled
            if (parsed.address && !contactForm.contact_address) {
                updateContactField("contact_address", parsed.address);
            }

            const cleanScannedLic = normalizeLicense(parsed.license_no);
            const duplicate = cleanScannedLic
                ? drivers.find((d) => (!editingDriver || d.id !== editingDriver.id) && normalizeLicense(d.license_no) === cleanScannedLic)
                : null;

            if (duplicate) {
                const driverName = duplicate.user ? `${duplicate.user.user_fname} ${duplicate.user.user_lname}` : "another driver";
                toast.warning(`Warning: License ${parsed.license_no} is already assigned to ${driverName}.`);
            } else {
                toast.success("License scanned with Tesseract.js! Details autofilled.");
            }
        } catch (err: unknown) {
            console.error("Tesseract OCR error:", err);
            toast.error("Failed to read license via OCR. You can still enter or edit details manually.");
        } finally {
            if (worker) {
                try {
                    await worker.terminate();
                } catch {
                    // ignore termination error
                }
            }
            setIsOcrProcessing(false);
            setOcrStatusText("");
        }
    };

    // Apply manual raw OCR text paste / scan
    const handleApplyRawOcr = () => {
        if (!ocrRawText.trim()) return;
        const parsed = parseLicenseText(ocrRawText);
        setLicenseForm((prev) => ({
            ...prev,
            license_no: parsed.license_no || prev.license_no,
            license_classification: parsed.license_classification || prev.license_classification,
            license_restrictions: parsed.license_restrictions || prev.license_restrictions,
            license_expiry_date: parsed.license_expiry_date || prev.license_expiry_date,
        }));
        toast.success("Autofill updated from OCR text!");
    };

    // Memoize good branch options
    const goodBranchOptions = React.useMemo((): { value: string; label: string }[] => {
        return goodBranches.map((branch) => ({
            value: branch.id.toString(),
            label: branch.branch_name,
        }));
    }, [goodBranches]);

    // Memoize bad branch options
    const badBranchOptions = React.useMemo((): { value: string; label: string }[] => {
        return [
            { value: "none", label: "None (Optional)" },
            ...badBranches.map((branch) => ({
                value: branch.id.toString(),
                label: branch.branch_name,
            })),
        ];
    }, [badBranches]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUserId || !selectedGoodBranchId) {
            toast.error("Please select a driver and good branch");
            return;
        }

        if (conflictingDriver) {
            const conflictName = conflictingDriver.user
                ? `${conflictingDriver.user.user_fname} ${conflictingDriver.user.user_lname}`
                : "another driver";
            toast.error(`License No. is already assigned to ${conflictName}. Each driver must have a unique license.`);
            return;
        }

        if (driverContactFieldsSupported && !hasValidOptionalEmail(contactForm.contact_email)) {
            toast.error("Please enter a valid contact email");
            return;
        }

        setLoading(true);
        try {
            let recordId = licenseForm.license_file_record_id;

            // If a new license file was captured/uploaded, push to Document Management
            if (scannedFile) {
                try {
                    const uploadResult = await uploadDriverLicenseFile(scannedFile, parseInt(selectedUserId));
                    if (uploadResult.record_id) {
                        recordId = uploadResult.record_id;
                    }
                } catch (uploadErr) {
                    console.warn("Document management upload warning:", uploadErr);
                }
            } else if (!recordId && licenseForm.license_no.trim()) {
                // If license info is entered and no file uploaded, link or generate document record
                try {
                    const blob = new Blob([`Driver License: ${licenseForm.license_no}\nClassification: ${licenseForm.license_classification}`], { type: "text/plain" });
                    const file = new File([blob], `license_${licenseForm.license_no.trim()}.txt`, { type: "text/plain" });
                    const uploadResult = await uploadDriverLicenseFile(file, parseInt(selectedUserId));
                    if (uploadResult.record_id) {
                        recordId = uploadResult.record_id;
                    }
                } catch (uploadErr) {
                    console.warn("Document management fallback upload warning:", uploadErr);
                }
            }

            const driverData = {
                user_id: parseInt(selectedUserId),
                branch_id: parseInt(selectedGoodBranchId),
                bad_branch_id: selectedBadBranchId !== "none" ? parseInt(selectedBadBranchId) : null,
                license_no: licenseForm.license_no.trim() || null,
                license_classification: licenseForm.license_classification.trim() || null,
                license_restrictions: licenseForm.license_restrictions.trim() || null,
                license_expiry_date: licenseForm.license_expiry_date || null,
                license_file_record_id: recordId,
                license_verified_at: isVerified ? new Date().toISOString() : null,
                is_verified: isVerified,
                license_verified: isVerified,
                license_verified_by: isVerified ? (licenseForm.license_verified_by || undefined) : null,
                ...(driverContactFieldsSupported ? contactForm : {}),
            };

            if (editingDriver) {
                await updateDriver(editingDriver.id, driverData);
                toast.success("Driver updated successfully");
            } else {
                await saveDriver(driverData);
                toast.success("Driver added successfully");
            }

            onSuccess();
            onClose();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "An error occurred";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 flex flex-col rounded-2xl border-white/10 overflow-hidden">
                <DialogHeader className="p-6 pb-2 shrink-0 border-b">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {editingDriver ? "Edit Driver" : "Add Driver"}
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
                            OCR & Document Linked
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        {editingDriver
                            ? "Review and update driver information, license documents, and assigned branches."
                            : "Scan driver's license for automated OCR fill, review details, and link to Document Management."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <form id="driver-form" onSubmit={handleSubmit} className="space-y-6 p-6">
                        {/* 1. OCR License Capture & Autofill Section */}
                        <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Camera className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-2">
                                            Driver&apos;s License OCR &amp; Autofill
                                            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Upload or capture license to automatically extract details and link to Document Management.
                                        </p>
                                    </div>
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={handleCaptureLicense}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isOcrProcessing}
                                    className="rounded-lg border-primary/30 text-primary hover:bg-primary/10 font-bold"
                                >
                                    {isOcrProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="mr-2 h-4 w-4" />
                                            Capture / Upload License
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* OCR Progress Bar & Status */}
                            {isOcrProcessing && (
                                <div className="space-y-2 p-3 bg-background/90 rounded-lg border border-primary/20 animate-in fade-in-50 duration-200">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-primary flex items-center gap-1.5">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            {ocrStatusText || "Processing OCR..."}
                                        </span>
                                        <span className="font-mono text-muted-foreground">{ocrProgress}%</span>
                                    </div>
                                    <Progress value={ocrProgress} className="h-1.5" />
                                </div>
                            )}

                            {/* Preview & OCR Read Status */}
                            {previewUrl && (
                                <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-background/80 rounded-lg border border-border">
                                    <div className="relative w-36 h-20 rounded-md overflow-hidden border bg-muted flex items-center justify-center shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={previewUrl} alt="License preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 space-y-1 text-xs">
                                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            License Document Attached
                                        </div>
                                        <p className="text-muted-foreground">
                                            {scannedFile ? scannedFile.name : "Stored in Document Management records"}
                                        </p>
                                        <div className="flex items-center gap-2 pt-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[11px] text-primary"
                                                onClick={() => setShowRawOcrInput(!showRawOcrInput)}
                                            >
                                                {showRawOcrInput ? "Hide OCR Raw Text" : "View / Edit Raw OCR Text"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showRawOcrInput && (
                                <div className="space-y-2 p-3 bg-background rounded-lg border border-border">
                                    <label className="text-xs font-semibold text-muted-foreground">
                                        OCR Scanned Text (Can edit and re-apply autofill):
                                    </label>
                                    <Textarea
                                        value={ocrRawText}
                                        onChange={(e) => setOcrRawText(e.target.value)}
                                        placeholder="Paste or edit license text here..."
                                        className="h-20 text-xs font-mono resize-none"
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-xs font-bold"
                                        onClick={handleApplyRawOcr}
                                    >
                                        Re-apply Autofill from Text
                                    </Button>
                                </div>
                            )}

                            {/* License Fields Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            License Number
                                        </label>
                                        {conflictingDriver && (
                                            <span className="text-[11px] text-destructive font-medium flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Already assigned
                                            </span>
                                        )}
                                    </div>
                                    <Input
                                        value={licenseForm.license_no}
                                        onChange={(e) => updateLicenseField("license_no", e.target.value)}
                                        placeholder="e.g. N01-23-456789"
                                        className={cn(
                                            "h-9 rounded-lg transition-colors",
                                            conflictingDriver && "border-destructive focus-visible:ring-destructive/30"
                                        )}
                                    />
                                    {conflictingDriver && (
                                        <p className="text-[11px] text-destructive font-medium leading-tight">
                                            Already assigned to {conflictingDriver.user ? `${conflictingDriver.user.user_fname} ${conflictingDriver.user.user_lname}` : "another driver"}.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                        Classification
                                    </label>
                                    <Input
                                        value={licenseForm.license_classification}
                                        onChange={(e) => updateLicenseField("license_classification", e.target.value)}
                                        placeholder="Professional / Non-Professional"
                                        className="h-9 rounded-lg"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                        Expiration Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={licenseForm.license_expiry_date}
                                        onChange={(e) => updateLicenseField("license_expiry_date", e.target.value)}
                                        className="h-9 rounded-lg"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                        Restrictions / Conditions
                                    </label>
                                    <Input
                                        value={licenseForm.license_restrictions}
                                        onChange={(e) => updateLicenseField("license_restrictions", e.target.value)}
                                        placeholder="e.g. 1, 2, A, B"
                                        className="h-9 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Fleet Admin Validation Review Checkbox */}
                            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                <input
                                    type="checkbox"
                                    id="license-verified-chk"
                                    checked={isVerified}
                                    onChange={(e) => setIsVerified(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="license-verified-chk" className="text-xs font-medium text-foreground cursor-pointer select-none">
                                    Fleet Admin Verified (Validated that OCR autofilled license data matches physical ID)
                                </label>
                            </div>
                        </div>

                        {/* User Selection */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                Select Driver*
                            </label>
                            <Popover open={userOpen} onOpenChange={setUserOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={userOpen}
                                        className="w-full h-10 justify-between rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                                    >
                                        {selectedUserId
                                            ? userOptions.find((opt) => opt.value === selectedUserId)?.label
                                            : "Search drivers..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="max-h-[300px] flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                        <CommandInput placeholder="Search drivers..." />
                                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                                            <CommandEmpty>No drivers found.</CommandEmpty>
                                            <CommandGroup>
                                                {userOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        value={opt.label}
                                                        onSelect={() => {
                                                            setSelectedUserId(opt.value);
                                                            setUserOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedUserId === opt.value ? "opacity-100" : "opacity-0")} />
                                                        {opt.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground/60 font-medium">Select the user to assign as driver</p>
                        </div>

                        {/* Good Branch Selection */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                Good Branch*
                            </label>
                            <Popover open={goodBranchOpen} onOpenChange={setGoodBranchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={goodBranchOpen}
                                        className="w-full h-10 justify-between rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                                    >
                                        {selectedGoodBranchId
                                            ? goodBranchOptions.find((opt) => opt.value === selectedGoodBranchId)?.label
                                            : "Search branches..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="max-h-[300px] flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                        <CommandInput placeholder="Search branches..." />
                                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                                            <CommandEmpty>No branches found.</CommandEmpty>
                                            <CommandGroup>
                                                {goodBranchOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        value={opt.label}
                                                        onSelect={() => onGoodBranchChange(opt.value)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedGoodBranchId === opt.value ? "opacity-100" : "opacity-0")} />
                                                        {opt.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground/60 font-medium">
                                {goodBranches.length} good branch(es) available
                            </p>
                        </div>

                        {/* Bad Branch Selection */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                Bad Branch
                            </label>
                            <Popover open={badBranchOpen} onOpenChange={setBadBranchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={badBranchOpen}
                                        className="w-full h-10 justify-between rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                                    >
                                        {selectedBadBranchId && selectedBadBranchId !== "none"
                                            ? badBranchOptions.find((opt) => opt.value === selectedBadBranchId)?.label
                                            : "None (Optional)"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="max-h-[300px] flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                        <CommandInput placeholder="Search branches..." />
                                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                                            <CommandEmpty>No branches found.</CommandEmpty>
                                            <CommandGroup>
                                                {badBranchOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        value={opt.label}
                                                        onSelect={() => {
                                                            setSelectedBadBranchId(opt.value);
                                                            setBadBranchOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedBadBranchId === opt.value ? "opacity-100" : "opacity-0")} />
                                                        {opt.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground/60 font-medium">
                                {badBranches.length} bad branch(es) available (Optional)
                            </p>
                        </div>

                        {driverContactFieldsSupported && (
                            <>
                                {/* Contact Information */}
                                <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                            Contact Information
                                        </h3>
                                        <p className="text-xs text-muted-foreground/60 font-medium">
                                            Driver-specific contact details for dispatch coordination.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                                Phone
                                            </label>
                                            <Input
                                                value={contactForm.contact_phone}
                                                onChange={(e) => updateContactField("contact_phone", e.target.value)}
                                                placeholder="Enter phone number"
                                                className="h-10 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                                Email
                                            </label>
                                            <Input
                                                type="email"
                                                value={contactForm.contact_email}
                                                onChange={(e) => updateContactField("contact_email", e.target.value)}
                                                placeholder="Enter email address"
                                                className="h-10 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            Address
                                        </label>
                                        <Textarea
                                            value={contactForm.contact_address}
                                            onChange={(e) => updateContactField("contact_address", e.target.value)}
                                            placeholder="Enter address"
                                            className="min-h-20 rounded-lg resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Emergency Contact Information */}
                                <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                            Emergency Contact Information
                                        </h3>
                                        <p className="text-xs text-muted-foreground/60 font-medium">
                                            Optional emergency details for driver records.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                                Contact Name
                                            </label>
                                            <Input
                                                value={contactForm.emergency_contact_name}
                                                onChange={(e) => updateContactField("emergency_contact_name", e.target.value)}
                                                placeholder="Enter contact name"
                                                className="h-10 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                                Relationship
                                            </label>
                                            <Input
                                                value={contactForm.emergency_contact_relationship}
                                                onChange={(e) => updateContactField("emergency_contact_relationship", e.target.value)}
                                                placeholder="Enter relationship"
                                                className="h-10 rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                                Phone
                                            </label>
                                            <Input
                                                value={contactForm.emergency_contact_phone}
                                                onChange={(e) => updateContactField("emergency_contact_phone", e.target.value)}
                                                placeholder="Enter emergency phone number"
                                                className="h-10 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                                            Address
                                        </label>
                                        <Textarea
                                            value={contactForm.emergency_contact_address}
                                            onChange={(e) => updateContactField("emergency_contact_address", e.target.value)}
                                            placeholder="Enter emergency contact address"
                                            className="min-h-20 rounded-lg resize-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </div>

                <div className="p-6 flex justify-end gap-3 mt-auto border-t shrink-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="rounded-xl font-bold h-11 px-6 hover:bg-muted/50 transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        form="driver-form"
                        type="submit"
                        disabled={loading || Boolean(conflictingDriver)}
                        className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-primary disabled:opacity-50"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingDriver ? "Update Driver" : "Save Driver"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
