'use server';

import { fetchItems } from '../services/api';
import { UserRow } from './hooks/use-stock-transfer-summary';

export interface UnitRow {
  unit_id: number;
  unit_name: string;
  unit_shortcut: string;
}

/**
 * Server action to fetch users for the summary module.
 */
export async function getSummaryUsers(): Promise<UserRow[]> {
  try {
    const res = await fetchItems<UserRow>("items/user", {
      limit: -1,
      fields: ["user_id", "user_fname", "user_mname", "user_lname"].join(","),
    });
    return res.data || [];
  } catch (err) {
    console.error('[Summary Action] Failed to fetch users:', err);
    return [];
  }
}

/**
 * Server action to fetch units for the summary module.
 */
export async function getSummaryUnits(): Promise<UnitRow[]> {
  try {
    const res = await fetchItems<UnitRow>("items/units", {
      limit: -1,
      fields: ["unit_id", "unit_name", "unit_shortcut"].join(","),
    });
    return res.data || [];
  } catch (err) {
    console.error('[Summary Action] Failed to fetch units:', err);
    return [];
  }
}
