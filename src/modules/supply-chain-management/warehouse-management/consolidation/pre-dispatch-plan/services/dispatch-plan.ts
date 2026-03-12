/**
 * Pre Dispatch Plan Service Layer
 * Composition of specialized services for queries, lifecycle, and master data.
 */

import { dispatchPlanDataService } from "./dispatch-plan-data";
import { dispatchPlanLifecycleService } from "./dispatch-plan-lifecycle";
import { dispatchPlanQueryService } from "./dispatch-plan-query";

export const dispatchPlanService = {
  ...dispatchPlanQueryService,
  ...dispatchPlanLifecycleService,
  ...dispatchPlanDataService,
};
