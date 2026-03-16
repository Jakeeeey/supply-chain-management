import { ForConsolidationOrder } from "../types";

export const fetchForConsolidationQueue = async (): Promise<ForConsolidationOrder[]> => {
    const response = await fetch("/api/scm/monitoring/for-consolidation");
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to load queue.");
    }

    if (!Array.isArray(data)) {
        throw new Error("Invalid data format received.");
    }

    return data;
};