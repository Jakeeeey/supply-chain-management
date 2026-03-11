import { useState, useCallback } from "react";
import {
    fetchAllActiveSuppliers,
    fetchAllUsers,
    fetchPickersBySupplier,
    assignPicker,
    unassignPicker
} from "../providers/fetchProvider";
import { PickerAssignmentDto, UserDto, SupplierDto } from "../types";

export function usePickerAssignments() {
    const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
    const [allUsers, setAllUsers] = useState<UserDto[]>([]);
    const [assignedPickers, setAssignedPickers] = useState<PickerAssignmentDto[]>([]);
    const [isLoadingLists, setIsLoadingLists] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

// In usePickerAssignments.ts

    // 🚀 Accept optional parameters here
    const loadSelectionLists = useCallback(async (supplierType?: string, departmentId?: number) => {
        setIsLoadingLists(true);
        try {
            const [suppliersData, usersData] = await Promise.all([
                fetchAllActiveSuppliers(supplierType),
                fetchAllUsers(departmentId)
            ]);

            setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
            setAllUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
            console.error("Failed to load selection lists:", error);
            setSuppliers([]);
            setAllUsers([]);
        } finally {
            setIsLoadingLists(false);
        }
    }, []);
    const loadAssignments = useCallback(async (supplierId: number) => {
        setIsUpdating(true);
        try {
            const data = await fetchPickersBySupplier(supplierId);
            setAssignedPickers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load assignments:", error);
            setAssignedPickers([]);
        } finally {
            setIsUpdating(false);
        }
    }, []);

    const handleAssign = async (userId: number, supplierId: number, supplierName: string) => {
        const user = allUsers.find(u => u.user_id === userId);
        if (!user) return;

        const tempId = Math.random();
        const newAssignment: PickerAssignmentDto = {
            id: tempId,
            userId: user.user_id,
            userName: `${user.user_fname} ${user.user_lname}`,
            supplierId: supplierId,
            supplierName: supplierName,
            isActive: true,
            assignedAt: new Date().toISOString()
        };

        // 🚀 Optimistic Update: Add to assigned list AND increment supplier count
        setAssignedPickers(prev => [...(Array.isArray(prev) ? prev : []), newAssignment]);
        setSuppliers(prev => prev.map(s =>
            s.supplier_id === supplierId ? { ...s, assignedCount: (s.assignedCount || 0) + 1 } : s
        ));

        const success = await assignPicker(userId, supplierId);
        if (!success) {
            // Revert on failure
            setAssignedPickers(prev => (Array.isArray(prev) ? prev.filter(p => p.id !== tempId) : []));
            setSuppliers(prev => prev.map(s =>
                s.supplier_id === supplierId ? { ...s, assignedCount: Math.max(0, (s.assignedCount || 0) - 1) } : s
            ));
            alert("Database mapping failed. Please try again.");
        }
    };

    const handleUnassign = async (userId: number, supplierId: number) => {
        const previousAssignments = Array.isArray(assignedPickers) ? [...assignedPickers] : [];

        // 🚀 Optimistic Update: Remove from list AND decrement supplier count
        setAssignedPickers(prev => (Array.isArray(prev) ? prev.filter(p => p.userId !== userId) : []));
        setSuppliers(prev => prev.map(s =>
            s.supplier_id === supplierId ? { ...s, assignedCount: Math.max(0, (s.assignedCount || 0) - 1) } : s
        ));

        const success = await unassignPicker(userId, supplierId);
        if (!success) {
            // Revert on failure
            setAssignedPickers(previousAssignments);
            setSuppliers(prev => prev.map(s =>
                s.supplier_id === supplierId ? { ...s, assignedCount: (s.assignedCount || 0) + 1 } : s
            ));
            alert("Failed to unassign picker. Please try again.");
        }
    };

    return {
        suppliers: Array.isArray(suppliers) ? suppliers : [],
        allUsers: Array.isArray(allUsers) ? allUsers : [],
        assignedPickers: Array.isArray(assignedPickers) ? assignedPickers : [],
        isLoadingLists,
        isUpdating,
        loadSelectionLists,
        loadAssignments,
        handleAssign,
        handleUnassign
    };
}