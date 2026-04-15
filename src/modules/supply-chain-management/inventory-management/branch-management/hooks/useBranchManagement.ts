"use client";

import * as React from "react";
import type { Branch, User } from "../types";
import { fetchBranches } from "../providers/fetchProvider";

export function useBranchManagement() {
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [users, setUsers] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = React.useState("");
    const [filterType, setFilterType] = React.useState<"All" | "Active" | "Inactive" | "Moving" | "Not Moving" | "Badstock">("All");

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 10;

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBranches();
            setBranches(data.branches || []);
            setUsers(data.users || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    // Reset to page 1 when search or filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    const filteredBranches = React.useMemo(() => {
        return branches.filter((b) => {
            // Filter by status
            const active = b.isActive === 1 || b.isActive === true;
            const moving = b.isMoving === 1 || b.isMoving === true;
            const badstock = b.isBadStock === 1 || b.isBadStock === true;

            if (filterType === "Active") {
                if (!active || badstock) return false;
            } else if (filterType === "Inactive") {
                if (active || badstock) return false;
            } else if (filterType === "Moving") {
                if (!moving || badstock) return false;
            } else if (filterType === "Not Moving") {
                if (moving || badstock) return false;
            } else if (filterType === "Badstock") {
                if (!badstock) return false;
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

    const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);

    return {
        branches: filteredBranches,
        users,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        currentPage,
        setCurrentPage,
        totalPages,
        itemsPerPage,
        refresh: loadData,
    };
}
