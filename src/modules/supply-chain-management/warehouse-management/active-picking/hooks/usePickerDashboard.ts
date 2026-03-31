import { useState, useEffect, useCallback } from "react";
import { ConsolidatorDto } from "../types";
import { fetchConsolidators, fetchActiveBranches, completePickingBatch } from "../providers/fetchProvider";

export function usePickerDashboard() {
    const [batches, setBatches] = useState<ConsolidatorDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [activeBatch, setActiveBatch] = useState<ConsolidatorDto | null>(null);

    const currentUserId = 1; // This can be replaced with a more robust user management solution

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const loadBranches = async () => {
            const activeBranches = await fetchActiveBranches();
            setBranches(activeBranches);
            if (activeBranches.length > 0 && !selectedBranchId) {
                setSelectedBranchId(activeBranches[0].id);
            }
        };
        loadBranches();
    }, []);

    const loadBatches = useCallback(async () => {
        if (!selectedBranchId) return;
        setLoading(true);
        try {
            const response = await fetchConsolidators(selectedBranchId, 0, 50, "Picking", debouncedSearch);
            setBatches(response?.content || []);
        } catch (error) {
            console.error("Failed to load picking batches");
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId, debouncedSearch]);

    useEffect(() => {
        loadBatches();
    }, [loadBatches]);

    const handleBatchCompletion = useCallback(async () => {
        if (!activeBatch) return;
        const success = await completePickingBatch(activeBatch.id);
        if (success) {
            setActiveBatch(null);
            loadBatches();
        } else {
            console.error("Failed to complete the batch. Check backend logs.");
        }
    }, [activeBatch, loadBatches]);

    return {
        batches,
        loading,
        searchQuery,
        branches,
        selectedBranchId,
        activeBatch,
        currentUserId,
        setSearchQuery,
        setSelectedBranchId,
        setActiveBatch,
        handleBatchCompletion,
    };
}
