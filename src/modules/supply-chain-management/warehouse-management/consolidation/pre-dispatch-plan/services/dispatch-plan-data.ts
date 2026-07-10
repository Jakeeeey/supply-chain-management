/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BranchOption,
  ClusterOption,
  DispatchPlan,
  DispatchPlanMasterData,
  DriverOption,
  VehicleOption,
} from "../types/dispatch-plan.schema";
import { fetchItems } from "./dispatch-plan-api";

export const dispatchPlanDataService = {
  /**
   * Fetches reference data needed for PDP creation forms.
   */
  async fetchMasterData(): Promise<DispatchPlanMasterData> {
    const [driversRes, vehiclesRes, clustersRes, branchesRes, vehicleTypesRes] =
      await Promise.all([
        // Drivers: only users from department 8
        fetchItems<DriverOption>("/items/user", {
          "filter[user_department][_eq]": 8,
          fields: "user_id,user_fname,user_mname,user_lname,user_department",
          limit: -1,
        }),
        // Vehicles: active vehicles with capacity info
        fetchItems<VehicleOption>("/items/vehicles", {
          "filter[status][_eq]": "Active",
          fields:
            "vehicle_id,vehicle_plate,vehicle_type,branch_id,status,maximum_weight,minimum_load",
          limit: -1,
        }),
        // Clusters
        fetchItems<ClusterOption>("/items/cluster", {
          fields: "id,cluster_name,minimum_amount",
          limit: -1,
        }),
        // Branches: active branches
        fetchItems<BranchOption>("/items/branches", {
          "filter[isActive][_eq]": 1,
          fields: "id,branch_name,branch_description,branch_code",
          limit: -1,
        }),
        // Vehicle Types (needed to display type names in modals)
        fetchItems<{ id: number; type_name: string }>("/items/vehicle_type", {
          fields: "id,type_name",
          limit: -1,
        }),
      ]);

    const vehicleTypeMap = new Map<string, string>();
    (vehicleTypesRes.data || []).forEach((vt) => {
      vehicleTypeMap.set(String(vt.id), vt.type_name);
    });

    const enrichedVehicles = (vehiclesRes.data || []).map((v) => ({
      ...v,
      vehicle_type_name: v.vehicle_type
        ? vehicleTypeMap.get(String(v.vehicle_type)) || "Unknown Type"
        : undefined,
    }));

    return {
      drivers: driversRes.data || [],
      vehicles: enrichedVehicles,
      clusters: clustersRes.data || [],
      branches: branchesRes.data || [],
    };
  },

  /**
   * Generates a unique dispatch number in PDP-XXXXX format.
   */
  async generateDispatchNo(): Promise<string> {
    const result = await fetchItems<{ dispatch_no: string }>(
      "/items/dispatch_plan",
      {
        sort: "-dispatch_no",
        fields: "dispatch_no",
        limit: 1,
      },
    );

    const lastNo = result.data?.[0]?.dispatch_no;
    let nextNum = 1;

    if (lastNo) {
      // Extract number from PDP-XXXXX format
      const match = lastNo.match(/PDP-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }

    return `PDP-${String(nextNum).padStart(5, "0")}`;
  },

  /**
   * Fetches dashboard metrics (counts and sums) grouped by status.
   */
  async fetchMetrics(
    clusterId?: number,
    branchId?: number,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const params: Record<string, any> = {
      fields: "status,total_amount",
      limit: -1, // Fetch all to aggregate
    };

    if (clusterId) {
      params["filter[cluster_id][_eq]"] = clusterId;
    }
    if (branchId) {
      params["filter[branch_id][_eq]"] = branchId;
    }
    if (status) {
      params["filter[status][_eq]"] = status;
    }
    if (search) {
      params["filter[dispatch_no][_icontains]"] = search;
    }

    if (startDate && endDate) {
      params["filter[dispatch_date][_between]"] = [
        `${startDate}T00:00:00`,
        `${endDate}T23:59:59`,
      ];
    } else if (startDate) {
      params["filter[dispatch_date][_gte]"] = `${startDate}T00:00:00`;
    } else if (endDate) {
      params["filter[dispatch_date][_lte]"] = `${endDate}T23:59:59`;
    }

    const { data } = await fetchItems<DispatchPlan>(
      "/items/dispatch_plan",
      params,
    );

    const metrics = {
      pendingCount: 0,
      pendingValue: 0,
      readyCount: 0,
      activeCount: 0,
      dispatchedCount: 0,
      dispatchedValue: 0,
    };

    (data || []).forEach((plan) => {
      const amount = Number(plan.total_amount || 0);
      switch (plan.status) {
        case "Pending":
          metrics.pendingCount++;
          metrics.pendingValue += amount;
          break;
        case "Approved":
          metrics.readyCount++;
          break;
        case "Picking":
        case "Picked":
          metrics.activeCount++;
          break;
        case "Dispatched":
          metrics.dispatchedCount++;
          metrics.dispatchedValue += amount;
          break;
      }
    });

    return metrics;
  },
};
