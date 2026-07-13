const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const token = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN || "";

if (!baseUrl || !token) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL and a Directus service/static token are required");
}

const { rebuildAllInventorySummaries } = await import(
  "../src/app/api/scm/fleet-management/parts-inventory/_inventorySummary.ts"
);

const result = await rebuildAllInventorySummaries();
console.log(
  `Rebuilt fleet inventory summary for ${result.refreshedParts} parts; removed ${result.deletedOrphans} orphan rows.`,
);
