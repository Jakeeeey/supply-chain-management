import { useState, useMemo } from "react";
import { ConsolidatorDetailsDto } from "../types";

interface GroupedDetails {
    [supplier: string]: {
        [brand: string]: {
            [category: string]: ConsolidatorDetailsDto[];
        };
    };
}

export function usePickingList(groupedDetails: GroupedDetails) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showRfidOnly, setShowRfidOnly] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    const isSearching = useMemo(() => searchQuery.trim() !== "" || showRfidOnly, [searchQuery, showRfidOnly]);

    const toggleCollapse = (id: string) => {
        setCollapsedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredGroupedDetails = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase().trim();
        if (!lowerQuery && !showRfidOnly) {
            return groupedDetails;
        }

        const result: GroupedDetails = {};

        for (const supplier in groupedDetails) {
            const brands = groupedDetails[supplier];
            const filteredBrands: GroupedDetails[string] = {};

            for (const brand in brands) {
                const categories = brands[brand];
                const filteredCategories: GroupedDetails[string][string] = {};

                for (const category in categories) {
                    const items = categories[category];
                    const filteredItems = items.filter(item => {
                        const matchesSearch = !lowerQuery ||
                            item.productName?.toLowerCase().includes(lowerQuery) ||
                            item.barcode?.toLowerCase().includes(lowerQuery) ||
                            item.productId?.toString().includes(lowerQuery);
                        const matchesRfidFilter = !showRfidOnly || item.unitOrder === 3;
                        return matchesSearch && matchesRfidFilter;
                    });

                    if (filteredItems.length > 0) {
                        filteredCategories[category] = filteredItems;
                    }
                }

                if (Object.keys(filteredCategories).length > 0) {
                    filteredBrands[brand] = filteredCategories;
                }
            }

            if (Object.keys(filteredBrands).length > 0) {
                result[supplier] = filteredBrands;
            }
        }

        return result;
    }, [groupedDetails, searchQuery, showRfidOnly]);

    const isFilteredEmpty = useMemo(() => Object.keys(filteredGroupedDetails).length === 0, [filteredGroupedDetails]);

    const clearFilters = () => {
        setSearchQuery("");
        setShowRfidOnly(false);
    };

    return {
        searchQuery,
        setSearchQuery,
        showRfidOnly,
        setShowRfidOnly,
        collapsedSections,
        toggleCollapse,
        isSearching,
        filteredGroupedDetails,
        isFilteredEmpty,
        clearFilters,
    };
}
