import type { Driver, DriverManagementCapabilities, DriverWithDetails, User, Branch } from "../types";

export async function fetchDriversWithDetails(): Promise<{
    drivers: DriverWithDetails[];
    users: User[];
    branches: Branch[];
    capabilities?: DriverManagementCapabilities;
}> {
    const res = await fetch("/api/scm/fleet-management/driver-management");
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
}

export async function saveDriver(driverData: Partial<Driver>): Promise<unknown> {
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

export async function updateDriver(id: number, driverData: Partial<Driver>): Promise<unknown> {
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

export async function deleteDriver(id: number): Promise<unknown> {
    const res = await fetch(`/api/scm/fleet-management/driver-management?id=${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "Failed to delete driver");
    }
    return res.json();
}

export async function uploadDriverLicenseFile(file: File, userId: number): Promise<{ file_id: string; record_id?: number }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", String(userId));
    formData.append("record_name", "Driver's License");
    formData.append("description", "Scanned Driver License from Fleet Management");

    const res = await fetch("/api/scm/fleet-management/driver-management/license-upload", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.details || "Failed to upload license document");
    }

    return res.json();
}

