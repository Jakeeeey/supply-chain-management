import type { Driver, DriverWithDetails, User, Branch } from "../types";

export async function fetchDriversWithDetails(): Promise<{
    drivers: DriverWithDetails[];
    users: User[];
    branches: Branch[];
}> {
    const res = await fetch("/api/scm/fleet-management/driver-management");
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
}

export async function saveDriver(driverData: any): Promise<any> {
    const res = await fetch("/api/scm/fleet-management/driver-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driverData),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to save driver");
    }
    return res.json();
}

export async function updateDriver(id: number, driverData: any): Promise<any> {
    const res = await fetch("/api/scm/fleet-management/driver-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...driverData }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to update driver");
    }
    return res.json();
}

export async function deleteDriver(id: number): Promise<any> {
    const res = await fetch(`/api/scm/fleet-management/driver-management?id=${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to delete driver");
    }
    return res.json();
}
