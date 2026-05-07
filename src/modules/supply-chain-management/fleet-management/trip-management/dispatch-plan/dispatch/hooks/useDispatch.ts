import * as React from "react";
import { KioskDispatchPlan, UserOption } from "../types";
import { fetchProvider } from "../providers/fetchProvider";
import { toast } from "sonner";

export function useDispatch() {
    const [plans, setPlans] = React.useState<KioskDispatchPlan[]>([]);
    const [users, setUsers] = React.useState<UserOption[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [plansData, usersData] = await Promise.all([
                fetchProvider.getPlans(),
                fetchProvider.getUsers()
            ]);
            setPlans(plansData);
            setUsers(usersData);
            setError(null);
        } catch (err) {
            setError("Failed to fetch data");
            toast.error("Error loading dispatch plans");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredPlans = React.useMemo(() => {
        return plans.filter(p => 
            p.doc_no.toLowerCase().includes(search.toLowerCase()) ||
            p.driver_name.toLowerCase().includes(search.toLowerCase()) ||
            p.vehicle_plate.toLowerCase().includes(search.toLowerCase())
        );
    }, [plans, search]);

    return {
        plans,
        filteredPlans,
        users,
        loading,
        error,
        search,
        setSearch,
        reload: fetchData
    };
}
