// src/app/api/scm/inventory-management/physical-inventory/running-inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDirectusBase, directusFetch } from "../_lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;
const COOKIE_NAME = "vos_access_token";

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.json(
            { ok: false, message: "Unauthorized: Missing access token" },
            { status: 401 },
        );
    }

    if (!SPRING_API_BASE_URL) {
        return NextResponse.json(
            { ok: false, error: "SPRING_API_BASE_URL is not configured." },
            { status: 500 },
        );
    }

    try {
        const incomingUrl = new URL(req.url);

        const branchName = incomingUrl.searchParams.get("branchName")?.trim() ?? "";
        const cutOffDateStr = incomingUrl.searchParams.get("cutOffDate")?.trim() ?? "";
        
        let cutOffTime = Number.MAX_SAFE_INTEGER;
        if (cutOffDateStr) {
            // The frontend must send a UTC ISO string (e.g. 2026-05-15T21:06:00.000Z).
            // new Date() parses ISO strings with 'Z' or offset as UTC correctly.
            cutOffTime = new Date(cutOffDateStr).getTime();
            if (isNaN(cutOffTime)) {
                console.warn("[running-inventory] Invalid cutOffDate received:", cutOffDateStr, "— defaulting to no cutoff.");
                cutOffTime = Number.MAX_SAFE_INTEGER;
            } else {
                console.log(`[running-inventory] Cutoff: ${cutOffDateStr} → ${new Date(cutOffTime).toISOString()} (UTC)`);
            }
        }

        const targetUrl = new URL(
            `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-product-movements/filter`,
        );

        if (branchName) {
            targetUrl.searchParams.set("branchName", branchName);
        }

        const springRes = await fetch(targetUrl.toString(), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            throw new Error(`Spring API responded with status: ${springRes.status}`);
        }

        const text = await springRes.text();
        interface PhDetail {
            ph_id?: { id?: number; ph_no?: string; date_encoded?: string };
            product_id?: {
                product_id?: number | string;
                parent_id?: number | string | null;
                unit_of_measurement?: { unit_name?: string };
                unit_of_measurement_count?: number;
            };
            system_count?: number;
            physical_count?: number;
        }
        interface MovementRow {
            ts?: string | number;
            docType?: string;
            docNo?: string;
            physical_count?: number;
            physicalCount?: number;
            system_count?: number;
            systemCount?: number;
            variance?: number;
            unitCount?: number;
            inBase?: number;
            outBase?: number;
            productId?: number | string;
            product_id?: number | string;
            parentId?: number | string | null;
            parent_id?: number | string | null;
            branchId?: number | string;
            branch_id?: number | string;
        }
        let movements: MovementRow[] = [];
        try {
            movements = JSON.parse(text);
        } catch {
            throw new Error("Failed to parse movements JSON");
        }

        if (!Array.isArray(movements)) {
            movements = [];
        }

        // --- DIRECTUS PATCHING LAYER ---
        // Fetch branch details and all PH records to synthesize missing 0-variance documents.
        // Uses the shared getDirectusBase() helper which reads NEXT_PUBLIC_API_BASE_URL from .env.local.
        try {
            const DIRECTUS_URL = getDirectusBase();

            const branchData = await directusFetch<{ data: { id: number }[] }>(
                `${DIRECTUS_URL}/items/branches?filter[branch_name][_eq]=${encodeURIComponent(branchName)}&fields=id`
            );
            const branchId = branchData.data?.[0]?.id;

            if (branchId) {
                const phData = await directusFetch<{ data: PhDetail[] }>(
                    `${DIRECTUS_URL}/items/physical_inventory_details?filter[ph_id][branch_id][_eq]=${branchId}&filter[ph_id][isCancelled][_eq]=0&filter[ph_id][isComitted][_eq]=1&fields=ph_id.id,ph_id.ph_no,ph_id.date_encoded,product_id.product_id,product_id.parent_id,product_id.unit_of_measurement.unit_name,product_id.unit_of_measurement_count,system_count,physical_count&limit=-1`
                );
                const phDetails = phData.data || [];

                const movementKeys = new Set(movements.map(m => `${m.docNo}-${m.productId || m.product_id}`));

                for (const d of phDetails) {
                    if (!d.ph_id?.ph_no || !d.product_id?.product_id) continue;

                    const key = `${d.ph_id.ph_no}-${d.product_id.product_id}`;
                    if (!movementKeys.has(key)) {
                        // Synthesize entirely missing PH record (Spring Boot omitted it due to 0 variance)
                        movements.push({
                            ts: d.ph_id.date_encoded,
                            docType: "Physical Inventory",
                            docNo: d.ph_id.ph_no,
                            productId: d.product_id.product_id,
                            product_id: d.product_id.product_id,
                            parentId: d.product_id.parent_id,
                            unitCount: d.product_id.unit_of_measurement_count || 1,
                            physical_count: d.physical_count,
                            system_count: d.system_count,
                            variance: (Number(d.physical_count) || 0) - (Number(d.system_count) || 0),
                            inBase: 0,
                            outBase: 0,
                            branchId: branchId,
                            branch_id: branchId
                        });
                    } else {
                        // Patch existing record with true physical and system counts
                        const existing = movements.find(m => m.docNo === d.ph_id!.ph_no && String(m.productId || m.product_id) === String(d.product_id!.product_id));
                        if (existing) {
                            existing.physical_count = d.physical_count;
                            existing.system_count = d.system_count;
                            existing.parentId = d.product_id!.parent_id;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to patch running inventory movements from Directus:", err);
        }
        // --- END DIRECTUS PATCHING LAYER ---

        // Group movements by Family ID first
        const movementsByFamily = new Map<string, MovementRow[]>();

        for (const row of movements) {
            if (!row) continue;
            const pid = Number(row.productId || row.product_id);
            if (!pid) continue;

            // Determine the family ID (use parent_id if available, fallback to product_id)
            const parentId = Number(row.parentId || row.parent_id || pid);
            const familyId = parentId === 0 ? pid : parentId;
            
            const fKey = String(familyId);
            if (!movementsByFamily.has(fKey)) {
                movementsByFamily.set(fKey, []);
            }
            movementsByFamily.get(fKey)!.push(row);
        }

        const inventoryMap = new Map<string, { productId: number; branchId: number; runningInventory: number }>();

        for (const familyMovements of movementsByFamily.values()) {
            const validMovements = familyMovements.filter(row => {
                if (!row.ts) return true;
                const rawStr = String(row.ts).trim();

                // Spring Boot returns timestamps as PH local time (UTC+8) with NO timezone suffix.
                // Node.js parses bare datetime strings as UTC, making them appear 8 hours too late.
                // We detect this: if there's no 'Z', no '+' offset, and no timezone info, treat as PH local (UTC+8).
                let rowTime: number;
                if (typeof row.ts === 'number') {
                    // Already a Unix ms timestamp — use directly
                    rowTime = row.ts;
                } else if (rawStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(rawStr)) {
                    // Has timezone info — parse directly
                    rowTime = new Date(rawStr).getTime();
                } else {
                    // No timezone info → assume PH local time (UTC+8) → add 8 hours to get true UTC
                    rowTime = new Date(rawStr).getTime() + (8 * 60 * 60 * 1000);
                }

                if (isNaN(rowTime)) return true;
                return rowTime <= cutOffTime;
            });

            if (validMovements.length === 0) continue;

            // Helper: parse PH local timestamp (no TZ) to true UTC ms
            const toUtcMs = (ts: string | number | undefined): number => {
                if (!ts) return 0;
                if (typeof ts === 'number') return ts;
                const s = String(ts).trim();
                const raw = new Date(s).getTime();
                if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return raw;
                return raw + (8 * 60 * 60 * 1000); // PH UTC+8 → UTC
            };

            validMovements.sort((a, b) => toUtcMs(a.ts) - toUtcMs(b.ts));

            // Running inventory accumulates all movements up to cutOffTime to maintain consistency with the movement ledger

            // 4. Calculate the running inventory FOR EACH INDIVIDUAL PRODUCT within the family
            const runningInventoryByProduct = new Map<number, number>();
            const branchIdByProduct = new Map<number, number>();

            for (const row of validMovements) {
                const pid = Number(row.productId || row.product_id);
                if (!pid) continue;

                const docT = String(row.docType || "").toUpperCase();
                const docN = String(row.docNo || "").toUpperCase();
                const isPH = docT === "PHYSICAL INVENTORY" || docN.startsWith("PH");

                let change = 0;
                if (isPH) {
                    const phys = row.physical_count !== undefined ? row.physical_count : row.physicalCount;
                    const sys = row.system_count !== undefined ? row.system_count : row.systemCount;
                    // For subsequent PH docs, we use the injected physical/system counts to derive true variance
                    const calcVariance = row.variance ?? ((Number(phys) || 0) - (Number(sys) || 0));
                    change = calcVariance * (Number(row.unitCount) || 1);
                } else {
                    change = (Number(row.inBase) || 0) - (Number(row.outBase) || 0);
                }

                runningInventoryByProduct.set(pid, (runningInventoryByProduct.get(pid) || 0) + change);
                branchIdByProduct.set(pid, Number(row.branchId || row.branch_id || branchIdByProduct.get(pid) || 0));
            }

            // Merge back into inventoryMap
            for (const [pid, runningInventory] of runningInventoryByProduct.entries()) {
                inventoryMap.set(String(pid), {
                    productId: pid,
                    branchId: branchIdByProduct.get(pid) || 0,
                    runningInventory
                });
            }
        }

        const results = Array.from(inventoryMap.values()).map(item => ({
            id: `calc-${item.productId}`,
            productId: item.productId,
            supplierId: 0, // Not strictly needed for module logic
            branchId: item.branchId,
            productCode: null,
            productName: "Calculated",
            productBarcode: null,
            productBrand: null,
            productCategory: null,
            unitName: null,
            unitCount: 1, // Base unit counts
            branchName: branchName,
            lastCutoff: cutOffDateStr || null,
            lastCount: null,
            movementAfter: null,
            runningInventory: item.runningInventory,
            supplierShortcut: null
        }));

        return NextResponse.json(results, {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Gateway Error";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 502 },
        );
    }
}