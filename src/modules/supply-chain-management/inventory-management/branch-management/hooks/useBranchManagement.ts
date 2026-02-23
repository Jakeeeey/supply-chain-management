"use client";

import * as React from "react";
import type { Branch, User } from "../types";
import { fetchBranches, fetchUsers } from "../providers/fetchProvider";

export function useBranchManagement() {
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [users, setUsers] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = React.useState("");
    const [filterType, setFilterType] = React.useState<"All" | "Badstock">("All");

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBranches();
            setBranches(data.branches || []);
            setUsers(data.users || []);
        } catch (e: any) {
            setError(e.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredBranches = React.useMemo(() => {
        return branches.filter((b) => {
            // Filter by type
            if (filterType === "Badstock") {
                if (!b.isBadStock) return false;
            } else {
                // In "All", maybe we should show all? Or just non-badstock?
                // Usually "All" means everything, but the prompt says 
                // "Filter of Badstock, and All". 
                // I'll assume "All" means non-badstock by default or literally all.
                // Let's look at the UI screenshot... 
                // In the screenshot there is "Badstock" and "All".
                // I'll show all in "All".
            }

            // Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    b.branch_name.toLowerCase().includes(query) ||
                    b.branch_code.toLowerCase().includes(query) ||
                    (b.state_province || "").toLowerCase().includes(query) ||
                    (b.city || "").toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [branches, searchQuery, filterType]);

    return {
        branches: filteredBranches,
        users,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        refresh: loadData,
    };
}
