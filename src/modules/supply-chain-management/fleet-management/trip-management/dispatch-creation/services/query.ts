import { fetchItems } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services/api";
import {
  BranchOption,
  COAOption,
  DispatchCreationMasterData,
  DriverOption,
  HelperOption,
  VehicleOption,
} from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";

export const dispatchCreationQueryService = {
  /**
   * Fetches all master lookup data required for the Dispatch Creation form.
   */
  async fetchMasterData(): Promise<DispatchCreationMasterData> {
    const [drivers, helpers, vehicles, branches, coas] = await Promise.all([
      // Fetch Drivers
      fetchItems<DriverOption>("/items/user", {
        "filter[user_department][_eq]": 8, // Driver department
        fields: "user_id,user_fname,user_lname",
        limit: -1,
      }),
      // Fetch Helpers
      fetchItems<HelperOption>("/items/user", {
        "filter[user_department][_eq]": 9, // Helper department
        fields: "user_id,user_fname,user_lname",
        limit: -1,
      }),
      // Fetch Vehicles
      fetchItems<VehicleOption>("/items/vehicles", {
        "filter[status][_eq]": "Active",
        fields: "vehicle_id,vehicle_plate",
        limit: -1,
      }),
      // Fetch Branches (Starting Points)
      fetchItems<BranchOption>("/items/branches", {
        "filter[isActive][_eq]": 1,
        fields: "id,branch_name",
        limit: -1,
      }),
      // Fetch Chart of Accounts for Budgeting
      fetchItems<COAOption>("/items/chart_of_accounts", {
        fields: "coa_id,account_title,gl_code",
        limit: -1,
      }),
    ]);

    return {
      drivers: drivers.data || [],
      helpers: helpers.data || [],
      vehicles: vehicles.data || [],
      branches: branches.data || [],
      coa: coas.data || [],
    };
  },

  /**
   * Fetches Approved Pre-Dispatch Plans available for conversion.
   */
  async fetchApprovedPreDispatchPlans() {
    return fetchItems<any>("/items/dispatch_plan", {
      "filter[status][_eq]": "Approved",
      fields:
        "dispatch_id,dispatch_no,driver_id,vehicle_id,cluster_id,branch_id,total_amount",
      limit: -1,
    });
  },
};
