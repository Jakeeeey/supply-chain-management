// BranchModal.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { cn } from "@/lib/utils";
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

import { 
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from "@/components/ui/combobox";

import type { User, Province, City, Barangay, Branch } from "../types";
import {
    fetchProvinces,
    fetchCities,
    fetchBarangays,
    saveBranch,
    updateBranch,
} from "../providers/fetchProvider";

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
    editingBranch?: Branch | null;
}

type FormValues = z.infer<typeof formSchema>;

/**
 * ✅ Removes the browser’s black outline (focus outline)
 * ✅ Uses theme tokens: ring-ring + border-ring
 *    -> ring color automatically follows your theme’s primary/accent (via CSS vars)
 */
const inputBase = "h-9 bg-background border-input transition-all";
const inputFocus =
    "outline-none focus:outline-none focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 " +
    "focus-visible:border-ring";

const textareaBase = "min-h-[80px] bg-background border-input transition-all";

const selectBase = "h-9 bg-background border-input transition-all";
const selectFocus =
    "outline-none focus:outline-none " +
    "focus:ring-2 focus:ring-ring focus:ring-offset-0 " +
    "focus:border-ring";

export function BranchModal({ isOpen, onClose, users, onSuccess, editingBranch }: BranchModalProps) {
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

    // Load Provinces and Set Form Values for Editing
    React.useEffect(() => {
        if (isOpen) {
            fetchProvinces().then(setProvinces);

            if (editingBranch) {
                // Pre-load cities and barangays if editing
                const loadLocationData = async () => {
                    const province = provinces.find(p => p.name === editingBranch.state_province);
                    if (province) {
                        const cityData = await fetchCities(province.code);
                        setCities(cityData);

                        const city = cityData.find((c: City) => c.name === editingBranch.city);
                        if (city) {
                            const brgyData = await fetchBarangays(city.code);
                            setBarangays(brgyData);
                        }
                    }
                };

                form.reset({
                    branch_name: editingBranch.branch_name,
                    branch_code: editingBranch.branch_code,
                    branch_head: editingBranch.branch_head.toString(),
                    branch_description: editingBranch.branch_description,
                    phone_number: editingBranch.phone_number || "",
                    state_province: editingBranch.state_province || "",
                    city: editingBranch.city || "",
                    brgy: editingBranch.brgy || "",
                    postal_code: editingBranch.postal_code || "",
                    isMoving: editingBranch.isMoving === 1 || editingBranch.isMoving === true,
                    isActive: editingBranch.isActive === 1 || editingBranch.isActive === true,
                });

                if (provinces.length > 0) {
                    loadLocationData();
                }
            } else {
                form.reset({
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
                });
            }
        }
    }, [isOpen, editingBranch, provinces.length]); // Added provinces.length to trigger location data load once provinces are available

    // Handle Province Change -> Load Cities
    const onProvinceChange = async (provinceCode: string | null) => {
        const provinceName = provinces.find((p) => p.code === provinceCode)?.name || "";
        form.setValue("state_province", provinceName);
        form.setValue("city", "");
        form.setValue("brgy", "");
        form.setValue("postal_code", "");
        setCities([]);
        setBarangays([]);

        if (!provinceCode) {
            form.setValue("state_province", "");
            return;
        }

        if (provinceCode) {
            const data = await fetchCities(provinceCode);
            setCities(data);
        }
    };

    // Handle City Change -> Load Barangays
    const onCityChange = async (cityCode: string | null) => {
        const cityName = cities.find((c) => c.code === cityCode)?.name || "";
        form.setValue("city", cityName);
        form.setValue("brgy", "");
        form.setValue("postal_code", "");
        setBarangays([]);

        if (!cityCode) {
            form.setValue("city", "");
            return;
        }

        if (cityCode) {
            const data = await fetchBarangays(cityCode);
            setBarangays(data);
        }
    };

    // Handle Barangay Change -> Remove Auto-populate Zip Code
    const onBarangayChange = (barangayCode: string | null) => {
        if (!barangayCode) {
            form.setValue("brgy", "");
            return;
        }
        const brgyName = barangays.find((b) => b.code === barangayCode)?.name || "";
        form.setValue("brgy", brgyName);
    };

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        try {
            const selectedUser = users.find(u =>
                `${u.user_fname} ${u.user_lname}` === values.branch_head ||
                u.user_id.toString() === values.branch_head
            );
            const branchHeadId = selectedUser ? selectedUser.user_id : parseInt(values.branch_head) || 0;

            if (editingBranch) {
                await updateBranch(editingBranch.id, {
                    ...values,
                    branch_head: branchHeadId,
                });
                toast.success("Branch updated successfully!");
            } else {
                await saveBranch({
                    ...values,
                    branch_head: branchHeadId,
                });
                toast.success("Branch registered successfully!");
            }
            onSuccess();
            onClose();
            form.reset();
        } catch (error: any) {
            toast.error(error?.message || `Failed to ${editingBranch ? "update" : "register"} branch`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const onInvalid = (errors: any) => {
        const messages = Object.values(errors)
            .map((err: any) => err.message)
            .filter(Boolean);

        if (messages.length > 0) {
            // Uniq messages to avoid double toasts for same error type if any
            const uniqueMessages = Array.from(new Set(messages));
            uniqueMessages.forEach((msg: any) => toast.error(msg));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] md:max-w-[800px] bg-background border-white/10 shadow-2xl p-0 flex flex-col gap-0 overflow-hidden outline-none">
                <DialogHeader className="px-6 py-4 border-b bg-muted/30">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        {editingBranch ? "Edit Branch" : "Add New Branch"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto max-h-[80vh] bg-background">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="p-6 space-y-6">
                            {/* Branch Identity Section */}
                            <div className="bg-card p-5 rounded-lg border dark:border-white/10 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">
                                        Branch Information
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="branch_name"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Branch Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Manila Main Office"
                                                        {...field}
                                                        className={cn(inputBase, inputFocus)}
                                                    />
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
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Branch Code
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. MLO-001"
                                                        {...field}
                                                        className={cn(inputBase, inputFocus)}
                                                    />
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
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Branch Head
                                                </FormLabel>
                                                <FormControl>
                                                    {(() => {
                                                        const selectedUser = users.find(u => 
                                                            u.user_id.toString() === field.value || 
                                                            `${u.user_fname} ${u.user_lname}` === field.value
                                                        );
                                                        const displayValue = selectedUser ? `${selectedUser.user_fname} ${selectedUser.user_lname}` : "";
                                                        
                                                        return (
                                                            <Combobox
                                                                value={displayValue}
                                                                onValueChange={field.onChange}
                                                            >
                                                                <ComboboxInput 
                                                                    placeholder="Assign a manager" 
                                                                    className={cn(selectBase, selectFocus)} 
                                                                />
                                                                <ComboboxContent className="z-[9999] !pointer-events-auto">
                                                                    <ComboboxList className="max-h-[300px] !overflow-y-auto !pointer-events-auto">
                                                                        {users.map((user) => (
                                                                            <ComboboxItem 
                                                                                key={user.user_id} 
                                                                                value={`${user.user_fname} ${user.user_lname}`}
                                                                            >
                                                                                {user.user_fname} {user.user_lname}
                                                                            </ComboboxItem>
                                                                        ))}
                                                                    </ComboboxList>
                                                                </ComboboxContent>
                                                            </Combobox>
                                                        );
                                                    })()}
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone_number"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Contact Number
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter phone/mobile"
                                                        {...field}
                                                        className={cn(inputBase, inputFocus)}
                                                    />
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
                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                        Branch Description
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Brief overview of the branch"
                                                            {...field}
                                                            className={cn(textareaBase, inputFocus)}
                                                        />
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
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">
                                        Location Details
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="state_province"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Province
                                                </FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            const code = provinces.find(p => p.name === val)?.code;
                                                            onProvinceChange(code || null);
                                                        }}
                                                    >
                                                        <ComboboxInput 
                                                            placeholder="Select Province" 
                                                            className={cn(selectBase, selectFocus)} 
                                                        />
                                                        <ComboboxContent className="z-[9999] !pointer-events-auto">
                                                            <ComboboxList className="max-h-[300px] !overflow-y-auto !pointer-events-auto">
                                                                {provinces.map((p) => (
                                                                    <ComboboxItem key={p.code} value={p.name}>
                                                                        {p.name}
                                                                    </ComboboxItem>
                                                                ))}
                                                            </ComboboxList>
                                                        </ComboboxContent>
                                                    </Combobox>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    City / Municipality
                                                </FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            const code = cities.find(c => c.name === val)?.code;
                                                            onCityChange(code || null);
                                                        }}
                                                    >
                                                        <ComboboxInput 
                                                            placeholder="Select City" 
                                                            disabled={!cities.length}
                                                            className={cn(selectBase, selectFocus)} 
                                                        />
                                                        <ComboboxContent className="z-[9999] !pointer-events-auto">
                                                            <ComboboxList className="max-h-[300px] !overflow-y-auto !pointer-events-auto">
                                                                {cities.map((c) => (
                                                                    <ComboboxItem key={c.code} value={c.name}>
                                                                        {c.name}
                                                                    </ComboboxItem>
                                                                ))}
                                                            </ComboboxList>
                                                        </ComboboxContent>
                                                    </Combobox>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="brgy"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Barangay
                                                </FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            const code = barangays.find(b => b.name === val)?.code;
                                                            onBarangayChange(code || null);
                                                        }}
                                                    >
                                                        <ComboboxInput 
                                                            placeholder="Select Barangay" 
                                                            disabled={!barangays.length}
                                                            className={cn(selectBase, selectFocus)} 
                                                        />
                                                        <ComboboxContent className="z-[9999] !pointer-events-auto">
                                                            <ComboboxList className="max-h-[300px] !overflow-y-auto !pointer-events-auto">
                                                                {barangays.map((b) => (
                                                                    <ComboboxItem key={b.code} value={b.name}>
                                                                        {b.name}
                                                                    </ComboboxItem>
                                                                ))}
                                                            </ComboboxList>
                                                        </ComboboxContent>
                                                    </Combobox>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="postal_code"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                    Zip Code
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter zip code"
                                                        {...field}
                                                        className={cn(inputBase, inputFocus)}
                                                    />
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
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </FormControl>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 cursor-pointer">
                                                is Moving?
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2.5 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </FormControl>
                                            <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 cursor-pointer">
                                                is Active?
                                            </FormLabel>
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
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 sm:flex-none h-9 text-xs font-semibold hover:bg-muted transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            onClick={form.handleSubmit(onSubmit, onInvalid)}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none h-9 text-xs font-bold min-w-[140px] shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    {editingBranch ? "Updating..." : "Registering..."}
                                </>
                            ) : (
                                editingBranch ? "Update Branch" : "Register Branch"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}