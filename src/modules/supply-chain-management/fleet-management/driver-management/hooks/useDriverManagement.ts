"use client";

import * as React from "react";
import type { DriverWithDetails, User, Branch } from "../types";
import { fetchDriversWithDetails } from "../providers/fetchProvider";

export function useDriverManagement() {
    const [drivers, setDrivers] = React.useState<DriverWithDetails[]>([]);
    const [users, setUsers] = React.useState<User[]>([]);
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [driverContactFieldsSupported, setDriverContactFieldsSupported] = React.useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = React.useState("");
    const [filterGoodBranch, setFilterGoodBranch] = React.useState<string>("all");
    const [filterBadBranch, setFilterBadBranch] = React.useState<string>("all");

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchDriversWithDetails();
            setDrivers(data.drivers || []);
            setUsers(data.users || []);
            setBranches(data.branches || []);
            setDriverContactFieldsSupported(data.capabilities?.driverContactFields === true);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    // Reset to page 1 when search or filter changes, and reset itemsPerPage when it changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterGoodBranch, filterBadBranch, itemsPerPage]);

    const filteredDrivers = React.useMemo(() => {
        return drivers
            .filter((d) => {
                // Filter by good branch
                if (filterGoodBranch !== "all" && d.good_branch?.id !== parseInt(filterGoodBranch)) {
                    return false;
                }

                // Filter by bad branch
                if (filterBadBranch !== "all") {
                    const badBranchId = parseInt(filterBadBranch);
                    if (d.bad_branch?.id !== badBranchId) {
                        return false;
                    }
                }

                // Search by driver identity and contact details
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const userIdStr = d.user_id?.toString() || "";
                    const userName = d.user
                        ? `${d.user.user_fname} ${d.user.user_mname || ""} ${d.user.user_lname}`.toLowerCase()
                        : "";
                    const contactDetails = [
                        d.contact_phone,
                        d.contact_email,
                        d.emergency_contact_name,
                        d.emergency_contact_phone,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    return userIdStr.includes(query) || userName.includes(query) || contactDetails.includes(query);
                }

                return true;
            })
            .sort((a, b) => {
                // Sort by newest to oldest (updated_at takes priority, then created_at)
                const aDate = new Date(a.updated_at || a.created_at).getTime();
                const bDate = new Date(b.updated_at || b.created_at).getTime();
                return bDate - aDate;
            });
    }, [drivers, searchQuery, filterGoodBranch, filterBadBranch]);

    const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);

    return {
        drivers: filteredDrivers,
        users,
        branches,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        filterGoodBranch,
        setFilterGoodBranch,
        filterBadBranch,
        setFilterBadBranch,
        currentPage,
        setCurrentPage,
        totalPages,
        itemsPerPage,
        refresh: loadData,
        setItemsPerPage,
        driverContactFieldsSupported,
    };
}
