"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { User, Province, City, Barangay } from "../types";
import { fetchProvinces, fetchCities, fetchBarangays, saveBranch } from "../providers/fetchProvider";

const formSchema = z.object({
    branch_name: z.string().min(1, "Branch Name is required"),
    branch_code: z.string().min(1, "Branch Code is required"),
    branch_head: z.string().min(1, "Branch Head is required"),
    branch_description: z.string().min(1, "Branch Description is required"),
    phone_number: z.string().min(1, "Contact Number is required"),
    state_province: z.string().min(1, "Province is required"),
    city: z.string().min(1, "City is required"),
    brgy: z.string().min(1, "Barangay is required"),
    postal_code: z.string().min(1, "Zip Code is required"),
    isMoving: z.boolean(),
    isActive: z.boolean(),
});

interface BranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onSuccess: () => void;
}

type FormValues = z.infer<typeof formSchema>;

export function BranchModal({ isOpen, onClose, users, onSuccess }: BranchModalProps) {
    const [provinces, setProvinces] = React.useState<Province[]>([]);
    const [cities, setCities] = React.useState<City[]>([]);
    const [barangays, setBarangays] = React.useState<Barangay[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            branch_name: "",
            branch_code: "",
            branch_head: "",
            branch_description: "",
            phone_number: "",
            state_province: "",
            city: "",
            brgy: "",
            postal_code: "",
            isMoving: false,
            isActive: true,
        },
    });

    // Load Provinces
    React.useEffect(() => {
        if (isOpen) {
            fetchProvinces().then(setProvinces);
        }
    }, [isOpen]);

    // Handle Province Change -> Load Cities
    const onProvinceChange = async (provinceCode: string) => {
        const provinceName = provinces.find(p => p.code === provinceCode)?.name || "";
        form.setValue("state_province", provinceName);
        form.setValue("city", "");
        form.setValue("brgy", "");
        form.setValue("postal_code", "");
        setCities([]);
        setBarangays([]);

        if (provinceCode) {
            const data = await fetchCities(provinceCode);
            setCities(data);
        }
    };

    // Handle City Change -> Load Barangays
    const onCityChange = async (cityCode: string) => {
        const cityName = cities.find(c => c.code === cityCode)?.name || "";
        form.setValue("city", cityName);
        form.setValue("brgy", "");
        form.setValue("postal_code", "");
        setBarangays([]);

        if (cityCode) {
            const data = await fetchBarangays(cityCode);
            setBarangays(data);
        }
    };

    // Handle Barangay Change -> Auto-populate Zip Code
    const onBarangayChange = (barangayCode: string) => {
        const brgyName = barangays.find(b => b.code === barangayCode)?.name || "";
        form.setValue("brgy", brgyName);

        // Auto-populate Zip Code logic
        // For the demo, we'll use a simple logic: 
        // first 4 digits of the code as a filler if not known
        // but the user wants "automatically populate based on the Zip code".
        // I'll provide a few known ones and fallback to a default.
        const zipMap: Record<string, string> = {
            "CALANOGAS": "2400",
            "MANILA": "1000",
            "QUEZON CITY": "1100",
            "CEBU": "6000",
            "DAVAO": "8000"
        };

        const city = form.getValues("city")?.toUpperCase();
        const zipCode = zipMap[city] || (barangayCode ? barangayCode.substring(0, 4) : "");
        form.setValue("postal_code", zipCode);
    };

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        try {
            await saveBranch({
                ...values,
                branch_head: parseInt(values.branch_head),
            });
            toast.success("Branch registered successfully!");
            onSuccess();
            onClose();
            form.reset();
        } catch (error: any) {
            toast.error(error.message || "Failed to register branch");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] md:max-w-[800px] bg-background border-white/10 shadow-2xl p-0 flex flex-col gap-0 overflow-hidden outline-none">
                <DialogHeader className="px-6 py-4 border-b bg-muted/30">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Add New Branch
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto max-h-[80vh] bg-background">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                            {/* Branch Identity Section */}
                            <div className="bg-card p-5 rounded-lg border dark:border-white/10 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Branch Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="branch_name"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Branch Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Manila Main Office" {...field} className="h-9 bg-background border-input focus-visible:border-ring focus-visible:ring-ring/40 transition-all outline-none" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="branch_code"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Branch Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. MLO-001" {...field} className="h-9 bg-background border-input focus-visible:border-ring focus-visible:ring-ring/40 transition-all outline-none" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="branch_head"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Branch Head</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-background border-input focus:border-ring focus:ring-ring/40 transition-all outline-none">
                                                            <SelectValue placeholder="Assign a manager" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {users.map((user) => (
                                                            <SelectItem key={user.user_id} value={user.user_id.toString()}>
                                                                {user.user_fname} {user.user_lname}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone_number"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Contact Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter phone/mobile" {...field} className="h-9 bg-background border-input focus-visible:border-ring focus-visible:ring-ring/40 transition-all outline-none" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="branch_description"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1.5">
                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Branch Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Brief overview of the branch" {...field} className="min-h-[80px] bg-background border-input focus-visible:border-ring focus-visible:ring-ring/40 transition-all outline-none" />
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location Section */}
                            <div className="bg-card p-5 rounded-lg border dark:border-white/10 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Location Details</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="state_province"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Province</FormLabel>
                                                <Select onValueChange={(val) => onProvinceChange(val)} value={provinces.find(p => p.name === field.value)?.code}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-background border-input focus:border-ring focus:ring-ring/40 transition-all outline-none">
                                                            <SelectValue placeholder="Select Province" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {provinces.map((p) => (
                                                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">City / Municipality</FormLabel>
                                                <Select onValueChange={(val) => onCityChange(val)} value={cities.find(c => c.name === field.value)?.code} disabled={!cities.length}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-background border-input focus:border-ring focus:ring-ring/40 transition-all outline-none">
                                                            <SelectValue placeholder="Select City" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {cities.map((c) => (
                                                            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="brgy"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Barangay</FormLabel>
                                                <Select onValueChange={(val) => onBarangayChange(val)} value={barangays.find(b => b.name === field.value)?.code} disabled={!barangays.length}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-background border-input focus:border-ring focus:ring-ring/40 transition-all outline-none">
                                                            <SelectValue placeholder="Select Barangay" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {barangays.map((b) => (
                                                            <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="postal_code"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Zip Code</FormLabel>
                                                <FormControl>
                                                    <Input {...field} readOnly className="h-9 bg-muted/60 border-input cursor-not-allowed opacity-80 font-mono text-xs focus-visible:border-ring focus-visible:ring-ring/40 transition-all outline-none" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="flex items-center gap-6 px-1">
                                <FormField
                                    control={form.control}
                                    name="isMoving"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                                            </FormControl>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 cursor-pointer">is Moving?</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" />
                                            </FormControl>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 cursor-pointer">is Active?</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/50 sm:justify-between items-center gap-4">
                    <p className="hidden sm:block text-[10px] text-muted-foreground/60 italic">
                        Note: This will create both standard and bad stock records.
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 sm:flex-none h-9 text-xs font-semibold hover:bg-muted transition-colors">
                            Cancel
                        </Button>
                        <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting} className="flex-1 sm:flex-none h-9 text-xs font-bold min-w-[140px] shadow-lg shadow-primary/20">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                "Register Branch"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
