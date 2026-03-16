//src/modules/supply-chain-management/physical-inventory-management/providers/fetchProvider.ts
import type {
    BranchRow,
    CategoryRow,
    DirectusItemResponse,
    DirectusItemsResponse,
    EligibleVariantRow,
    PhysicalInventoryDetailRFIDRow,
    PhysicalInventoryDetailRow,
    PhysicalInventoryDetailUpsertPayload,
    PhysicalInventoryHeaderRow,
    PhysicalInventoryHeaderUpsertPayload,
    PriceTypeRow,
    ProductLookupBundle,
    ProductPerPriceTypeRow,
    ProductPerSupplierRow,
    ProductRow,
    RfidOnhandResult,
    RunningInventoryApiRow,
    RunningInventoryRow,
    SupplierRow,
    UnitRow,
} from "../types";
import {
    buildGroupedPhysicalInventoryRows,
    buildPhysicalInventoryDetailPayloads,
} from "../utils/grouping";
import { isAllCategoryName, normalizeUnitCount } from "../utils/compute";

const API_BASE = "/api/scm/inventory-management/physical-inventory";

const TABLES = {
    physical_inventory: "physical_inventory",
    physical_inventory_details: "physical_inventory_details",
    physical_inventory_details_rfid: "physical_inventory_details_rfid",
    products: "products",
    product_per_supplier: "product_per_supplier",
    product_per_price_type: "product_per_price_type",
    categories: "categories",
    price_types: "price_types",
    units: "units",
    branches: "branches",
    suppliers: "suppliers",
} as const;

type DirectusBulkItemsResponse<T> = {
    data: T[];
};

export type BulkPhysicalInventoryDetailUpdateItem = {
    id: number;
    physical_count?: number | null;
    variance?: number | null;
    difference_cost?: number | null;
    amount?: number | null;
};

async function parseJsonSafe<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
        throw new Error("Empty server response.");
    }

    return JSON.parse(text) as T;
}

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, window.location.origin);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
    }

    const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`GET ${path} failed with ${response.status}. ${text}`);
    }

    return parseJsonSafe<T>(response);
}

async function apiPost<TPayload, TResult>(path: string, payload: TPayload): Promise<TResult> {
    const url = new URL(path, window.location.origin);

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`POST ${path} failed with ${response.status}. ${text}`);
    }

    return parseJsonSafe<TResult>(response);
}

async function apiPatch<TPayload, TResult>(path: string, payload: TPayload): Promise<TResult> {
    const url = new URL(path, window.location.origin);

    const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`PATCH ${path} failed with ${response.status}. ${text}`);
    }

    return parseJsonSafe<TResult>(response);
}

async function apiDelete(path: string): Promise<void> {
    const url = new URL(path, window.location.origin);

    const response = await fetch(url.toString(), {
        method: "DELETE",
        cache: "no-store",
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`DELETE ${path} failed with ${response.status}. ${text}`);
    }
}

async function directusGetItems<T>(
    table: string,
    params?: Record<string, string>,
): Promise<T[]> {
    const json = await apiGet<DirectusItemsResponse<T>>(
        `${API_BASE}/directus/${table}`,
        params,
    );
    return Array.isArray(json.data) ? json.data : [];
}

async function directusGetItem<T>(
    table: string,
    id: number,
    params?: Record<string, string>,
): Promise<T> {
    const json = await apiGet<DirectusItemResponse<T>>(
        `${API_BASE}/directus/${table}/${id}`,
        params,
    );
    return json.data;
}

async function directusPostItem<TPayload, TResult>(
    table: string,
    payload: TPayload,
): Promise<TResult> {
    const json = await apiPost<TPayload, DirectusItemResponse<TResult>>(
        `${API_BASE}/directus/${table}`,
        payload,
    );
    return json.data;
}

async function directusPostItems<TPayload, TResult>(
    table: string,
    payload: TPayload[],
): Promise<TResult[]> {
    const json = await apiPost<TPayload[], DirectusBulkItemsResponse<TResult>>(
        `${API_BASE}/directus/${table}`,
        payload,
    );
    return Array.isArray(json.data) ? json.data : [];
}

async function directusPatchItem<TPayload, TResult>(
    table: string,
    id: number,
    payload: TPayload,
): Promise<TResult> {
    const json = await apiPatch<TPayload, DirectusItemResponse<TResult>>(
        `${API_BASE}/directus/${table}/${id}`,
        payload,
    );
    return json.data;
}

async function directusDeleteItem(table: string, id: number): Promise<void> {
    await apiDelete(`${API_BASE}/directus/${table}/${id}`);
}

function mapRunningInventoryRow(row: RunningInventoryApiRow): RunningInventoryRow {
    return {
        id: row.id,
        product_id: row.productId,
        supplier_id: row.supplierId,
        branch_id: row.branchId,
        product_code: row.productCode,
        product_name: row.productName,
        product_barcode: row.productBarcode,
        product_brand: row.productBrand,
        product_category: row.productCategory,
        unit_name: row.unitName,
        unit_count: row.unitCount,
        branch_name: row.branchName,
        last_cutoff: row.lastCutoff,
        last_count: row.lastCount,
        movement_after: row.movementAfter,
        running_inventory: row.runningInventory,
        supplier_shortcut: row.supplierShortcut,
    };
}

function sortSupplierScopedCategories(categories: CategoryRow[]): CategoryRow[] {
    return [...categories].sort((a, b) => {
        const aIsAll = isAllCategoryName(a.category_name);
        const bIsAll = isAllCategoryName(b.category_name);

        if (aIsAll && !bIsAll) return -1;
        if (!aIsAll && bIsAll) return 1;

        return a.category_name.localeCompare(b.category_name);
    });
}

export function getSupplierScopedCategoriesFromLookup(
    supplierId: number,
    lookup: ProductLookupBundle,
): CategoryRow[] {
    const allowedProductIds = new Set(
        lookup.product_per_supplier
            .filter((row) => row.supplier_id === supplierId)
            .map((row) => row.product_id),
    );

    const categoryIds = new Set(
        lookup.products
            .filter(
                (product) =>
                    product.isActive === 1 &&
                    allowedProductIds.has(product.product_id) &&
                    product.product_category !== null,
            )
            .map((product) => product.product_category as number),
    );

    const realScopedCategories = lookup.categories.filter((category) =>
        categoryIds.has(category.category_id),
    );

    const allCategory = lookup.categories.find((category) =>
        isAllCategoryName(category.category_name),
    );

    const merged = allCategory
        ? [
            allCategory,
            ...realScopedCategories.filter(
                (row) => row.category_id !== allCategory.category_id,
            ),
        ]
        : realScopedCategories;

    return sortSupplierScopedCategories(
        merged.map((category) => ({
            ...category,
            is_all_category: isAllCategoryName(category.category_name),
        })),
    );
}

export async function fetchBranches(): Promise<BranchRow[]> {
    return directusGetItems<BranchRow>(TABLES.branches, {
        fields: "id,branch_name",
        sort: "branch_name",
        limit: "-1",
    });
}

export async function fetchSuppliers(): Promise<SupplierRow[]> {
    const rows = await directusGetItems<SupplierRow>(TABLES.suppliers, {
        fields: "id,supplier_name,supplier_shortcut,isActive,supplier_type",
        sort: "supplier_name",
        limit: "-1",
    });

    return rows.filter((row) => {
        const supplierType =
            typeof row.supplier_type === "string"
                ? row.supplier_type.trim().toUpperCase()
                : "";

        return row.isActive === 1 && supplierType === "TRADE";
    });
}

export async function fetchPriceTypes(): Promise<PriceTypeRow[]> {
    return directusGetItems<PriceTypeRow>(TABLES.price_types, {
        fields: "price_type_id,price_type_name,sort",
        sort: "sort,price_type_name",
        limit: "-1",
    });
}

export async function fetchCategories(): Promise<CategoryRow[]> {
    const rows = await directusGetItems<CategoryRow>(TABLES.categories, {
        fields: "category_id,category_name",
        sort: "category_name",
        limit: "-1",
    });

    return rows.map((row) => ({
        ...row,
        is_all_category: isAllCategoryName(row.category_name),
    }));
}

export async function fetchUnits(): Promise<UnitRow[]> {
    return directusGetItems<UnitRow>(TABLES.units, {
        fields: "unit_id,unit_name,unit_shortcut,order",
        sort: "order,unit_name",
        limit: "-1",
    });
}

export async function fetchProducts(): Promise<ProductRow[]> {
    return directusGetItems<ProductRow>(TABLES.products, {
        fields:
            "product_id,parent_id,product_code,product_name,barcode,product_category,product_brand,unit_of_measurement,unit_of_measurement_count,isActive",
        sort: "product_name",
        limit: "-1",
    });
}

export async function fetchProductPerSupplier(): Promise<ProductPerSupplierRow[]> {
    return directusGetItems<ProductPerSupplierRow>(TABLES.product_per_supplier, {
        fields: "id,product_id,supplier_id",
        limit: "-1",
    });
}

export async function fetchProductPerPriceType(): Promise<ProductPerPriceTypeRow[]> {
    return directusGetItems<ProductPerPriceTypeRow>(TABLES.product_per_price_type, {
        fields: "id,product_id,price_type_id,price",
        limit: "-1",
    });
}

export async function fetchProductLookupBundle(): Promise<ProductLookupBundle> {
    const [products, product_per_supplier, product_per_price_type, categories, units] =
        await Promise.all([
            fetchProducts(),
            fetchProductPerSupplier(),
            fetchProductPerPriceType(),
            fetchCategories(),
            fetchUnits(),
        ]);

    return {
        products,
        product_per_supplier,
        product_per_price_type,
        categories,
        units,
    };
}

export async function fetchSupplierScopedCategories(
    supplierId: number,
): Promise<CategoryRow[]> {
    const lookup = await fetchProductLookupBundle();
    return getSupplierScopedCategoriesFromLookup(supplierId, lookup);
}

export function buildEligibleVariants(input: {
    supplierId: number;
    categoryId: number;
    priceTypeId: number;
    lookup: ProductLookupBundle;
}): EligibleVariantRow[] {
    const { supplierId, categoryId, priceTypeId, lookup } = input;

    const selectedCategory = lookup.categories.find(
        (row) => row.category_id === categoryId,
    );
    const isAllCategory = isAllCategoryName(selectedCategory?.category_name);

    const productIdsBySupplier = new Set(
        lookup.product_per_supplier
            .filter((row) => row.supplier_id === supplierId)
            .map((row) => row.product_id),
    );

    const priceMap = new Map<number, ProductPerPriceTypeRow>();
    for (const row of lookup.product_per_price_type) {
        if (row.price_type_id === priceTypeId) {
            priceMap.set(row.product_id, row);
        }
    }

    const categoryMap = new Map<number, CategoryRow>();
    for (const row of lookup.categories) {
        categoryMap.set(row.category_id, row);
    }

    const unitMap = new Map<number, UnitRow>();
    for (const row of lookup.units) {
        unitMap.set(row.unit_id, row);
    }

    return lookup.products
        .filter((product) => product.isActive === 1)
        .filter((product) => productIdsBySupplier.has(product.product_id))
        .filter((product) => {
            if (isAllCategory) return true;
            return product.product_category === categoryId;
        })
        .filter((product) => priceMap.has(product.product_id))
        .map((product) => {
            const priceRow = priceMap.get(product.product_id) ?? null;
            const category =
                product.product_category !== null
                    ? categoryMap.get(product.product_category) ?? null
                    : null;
            const unit =
                product.unit_of_measurement !== null
                    ? unitMap.get(product.unit_of_measurement) ?? null
                    : null;

            return {
                product_id: product.product_id,
                parent_id: product.parent_id,
                product_code: product.product_code,
                product_name: product.product_name,
                barcode: product.barcode,
                category_id: product.product_category,
                category_name: category?.category_name ?? null,
                unit_id: product.unit_of_measurement,
                unit_name: unit?.unit_name ?? null,
                unit_shortcut: unit?.unit_shortcut ?? null,
                unit_order: unit?.order ?? null,
                unit_count: normalizeUnitCount(product.unit_of_measurement_count),
                unit_price: priceRow?.price ?? null,
            };
        })
        .sort((a, b) => {
            const nameDiff = a.product_name.localeCompare(b.product_name);
            if (nameDiff !== 0) return nameDiff;
            return a.product_id - b.product_id;
        });
}

export async function fetchRunningInventoryAll(): Promise<RunningInventoryRow[]> {
    const rows = await apiGet<RunningInventoryApiRow[]>(`${API_BASE}/running-inventory`);
    return Array.isArray(rows) ? rows.map(mapRunningInventoryRow) : [];
}

export async function fetchRunningInventoryByBranch(
    branchId: number,
): Promise<RunningInventoryRow[]> {
    const rows = await apiGet<RunningInventoryApiRow[]>(
        `${API_BASE}/running-inventory`,
        { branch_id: String(branchId) },
    );
    return Array.isArray(rows) ? rows.map(mapRunningInventoryRow) : [];
}

export async function fetchRunningInventoryFiltered(input: {
    branchName: string;
    supplierShortcut: string;
    productCategory?: string;
}): Promise<RunningInventoryRow[]> {
    const params: Record<string, string> = {
        branchName: input.branchName,
        supplierShortcut: input.supplierShortcut,
    };

    if (input.productCategory && input.productCategory.trim()) {
        params.productCategory = input.productCategory.trim();
    }

    const rows = await apiGet<RunningInventoryApiRow[]>(
        `${API_BASE}/running-inventory`,
        params,
    );

    return Array.isArray(rows) ? rows.map(mapRunningInventoryRow) : [];
}

export async function fetchPhysicalInventoryList(): Promise<PhysicalInventoryHeaderRow[]> {
    return directusGetItems<PhysicalInventoryHeaderRow>(TABLES.physical_inventory, {
        fields:
            "id,ph_no,date_encoded,cutOff_date,starting_date,price_type,stock_type,branch_id,remarks,isComitted,isCancelled,total_amount,supplier_id,category_id,encoder_id",
        sort: "-id",
        limit: "-1",
    });
}

export async function fetchPhysicalInventoryById(
    id: number,
): Promise<PhysicalInventoryHeaderRow> {
    return directusGetItem<PhysicalInventoryHeaderRow>(TABLES.physical_inventory, id, {
        fields:
            "id,ph_no,date_encoded,cutOff_date,starting_date,price_type,stock_type,branch_id,remarks,isComitted,isCancelled,total_amount,supplier_id,category_id,encoder_id",
    });
}

export async function fetchPhysicalInventoryDetails(
    phId: number,
): Promise<PhysicalInventoryDetailRow[]> {
    return directusGetItems<PhysicalInventoryDetailRow>(TABLES.physical_inventory_details, {
        filter: JSON.stringify({
            ph_id: { _eq: phId },
        }),
        fields:
            "id,ph_id,date_encoded,product_id,unit_price,system_count,physical_count,variance,difference_cost,amount,offset_match",
        sort: "id",
        limit: "-1",
    });
}

export async function fetchPhysicalInventoryDetailRfid(
    phId: number,
): Promise<PhysicalInventoryDetailRFIDRow[]> {
    const details = await fetchPhysicalInventoryDetails(phId);
    const detailIds = details.map((detail) => detail.id);

    if (!detailIds.length) return [];

    return directusGetItems<PhysicalInventoryDetailRFIDRow>(
        TABLES.physical_inventory_details_rfid,
        {
            filter: JSON.stringify({
                pi_detail_id: { _in: detailIds },
            }),
            fields: "id,pi_detail_id,rfid_tag,created_at,created_by",
            sort: "-id",
            limit: "-1",
        },
    );
}

export async function fetchPhysicalInventoryRfidCountByHeader(
    phId: number,
): Promise<Record<number, number>> {
    const details = await fetchPhysicalInventoryDetails(phId);
    const detailIds = details.map((detail) => detail.id);

    if (!detailIds.length) {
        return {};
    }

    const rows = await directusGetItems<Pick<PhysicalInventoryDetailRFIDRow, "pi_detail_id">>(
        TABLES.physical_inventory_details_rfid,
        {
            filter: JSON.stringify({
                pi_detail_id: { _in: detailIds },
            }),
            fields: "pi_detail_id",
            limit: "-1",
        },
    );

    return rows.reduce<Record<number, number>>((acc, row) => {
        acc[row.pi_detail_id] = (acc[row.pi_detail_id] ?? 0) + 1;
        return acc;
    }, {});
}

export async function fetchRfidOnhandByTag(
    rfid: string,
    branchId: number,
): Promise<RfidOnhandResult> {
    const normalized = rfid.trim();

    if (!normalized) {
        throw new Error("RFID tag is required.");
    }

    if (!Number.isFinite(branchId) || branchId <= 0) {
        throw new Error("Branch is required for RFID lookup.");
    }

    return apiGet<RfidOnhandResult>(`${API_BASE}/rfid-onhand`, {
        rfid: normalized,
        branchId: String(branchId),
    });
}

export async function fetchPhysicalInventoryDetailRfidByDetailId(
    piDetailId: number,
): Promise<PhysicalInventoryDetailRFIDRow[]> {
    return directusGetItems<PhysicalInventoryDetailRFIDRow>(
        TABLES.physical_inventory_details_rfid,
        {
            filter: JSON.stringify({
                pi_detail_id: { _eq: piDetailId },
            }),
            fields: "id,pi_detail_id,rfid_tag,created_at,created_by",
            sort: "-id",
            limit: "-1",
        },
    );
}

export async function createPhysicalInventoryHeader(
    payload: PhysicalInventoryHeaderUpsertPayload,
): Promise<PhysicalInventoryHeaderRow> {
    const json = await apiPost<
        PhysicalInventoryHeaderUpsertPayload,
        DirectusItemResponse<PhysicalInventoryHeaderRow>
    >(`/api/scm/physical-inventory/header`, payload);

    return json.data;
}

export async function updatePhysicalInventoryHeader(
    id: number,
    payload: Partial<PhysicalInventoryHeaderUpsertPayload>,
): Promise<PhysicalInventoryHeaderRow> {
    const json = await apiPatch<
        Partial<PhysicalInventoryHeaderUpsertPayload>,
        DirectusItemResponse<PhysicalInventoryHeaderRow>
    >(`/api/scm/physical-inventory/header/${id}`, payload);

    return json.data;
}

export async function commitPhysicalInventory(
    id: number,
): Promise<PhysicalInventoryHeaderRow> {
    const json = await apiPost<Record<string, never>, DirectusItemResponse<PhysicalInventoryHeaderRow>>(
        `/api/scm/physical-inventory/header/${id}/commit`,
        {},
    );

    return json.data;
}

export async function cancelPhysicalInventory(
    id: number,
): Promise<PhysicalInventoryHeaderRow> {
    const json = await apiPost<Record<string, never>, DirectusItemResponse<PhysicalInventoryHeaderRow>>(
        `/api/scm/physical-inventory/header/${id}/cancel`,
        {},
    );

    return json.data;
}

export async function createPhysicalInventoryDetailsBulk(
    payloads: PhysicalInventoryDetailUpsertPayload[],
): Promise<PhysicalInventoryDetailRow[]> {
    if (!payloads.length) {
        return [];
    }

    return directusPostItems<PhysicalInventoryDetailUpsertPayload, PhysicalInventoryDetailRow>(
        TABLES.physical_inventory_details,
        payloads,
    );
}

export async function updatePhysicalInventoryDetail(
    id: number,
    payload: Partial<PhysicalInventoryDetailUpsertPayload>,
): Promise<PhysicalInventoryDetailRow> {
    return directusPatchItem<
        Partial<PhysicalInventoryDetailUpsertPayload>,
        PhysicalInventoryDetailRow
    >(TABLES.physical_inventory_details, id, payload);
}

export async function updatePhysicalInventoryDetailsBulk(
    updates: BulkPhysicalInventoryDetailUpdateItem[],
): Promise<PhysicalInventoryDetailRow[]> {
    const json = await apiPatch<
        { updates: BulkPhysicalInventoryDetailUpdateItem[] },
        DirectusBulkItemsResponse<PhysicalInventoryDetailRow>
    >(`/api/scm/physical-inventory/details/bulk`, { updates });

    return Array.isArray(json.data) ? json.data : [];
}

export function buildVariantsFromSavedDetails(input: {
    details: PhysicalInventoryDetailRow[];
    priceTypeId: number | null;
    lookup: ProductLookupBundle;
}): EligibleVariantRow[] {
    const { details, priceTypeId, lookup } = input;

    const detailMap = new Map<number, PhysicalInventoryDetailRow>();
    for (const detail of details) {
        detailMap.set(detail.product_id, detail);
    }

    const productIds = new Set(details.map((row) => row.product_id));

    const categoryMap = new Map<number, CategoryRow>();
    for (const row of lookup.categories) {
        categoryMap.set(row.category_id, row);
    }

    const unitMap = new Map<number, UnitRow>();
    for (const row of lookup.units) {
        unitMap.set(row.unit_id, row);
    }

    const priceMap = new Map<number, ProductPerPriceTypeRow>();
    for (const row of lookup.product_per_price_type) {
        if (row.price_type_id === priceTypeId) {
            priceMap.set(row.product_id, row);
        }
    }

    return lookup.products
        .filter((product) => productIds.has(product.product_id))
        .map((product) => {
            const detail = detailMap.get(product.product_id);
            const category =
                product.product_category !== null
                    ? categoryMap.get(product.product_category) ?? null
                    : null;
            const unit =
                product.unit_of_measurement !== null
                    ? unitMap.get(product.unit_of_measurement) ?? null
                    : null;
            const priceRow = priceMap.get(product.product_id) ?? null;

            return {
                product_id: product.product_id,
                parent_id: product.parent_id,
                product_code: product.product_code,
                product_name: product.product_name,
                barcode: product.barcode,
                category_id: product.product_category,
                category_name: category?.category_name ?? null,
                unit_id: product.unit_of_measurement,
                unit_name: unit?.unit_name ?? null,
                unit_shortcut: unit?.unit_shortcut ?? null,
                unit_order: unit?.order ?? null,
                unit_count: normalizeUnitCount(product.unit_of_measurement_count),
                unit_price: detail?.unit_price ?? priceRow?.price ?? null,
            };
        })
        .sort((a, b) => {
            const nameDiff = a.product_name.localeCompare(b.product_name);
            if (nameDiff !== 0) return nameDiff;
            return a.product_id - b.product_id;
        });
}

export async function createPhysicalInventoryDetailRfid(input: {
    pi_detail_id: number;
    rfid_tag: string;
    created_by?: number | null;
}): Promise<PhysicalInventoryDetailRFIDRow> {
    return directusPostItem<
        { pi_detail_id: number; rfid_tag: string; created_by?: number | null },
        PhysicalInventoryDetailRFIDRow
    >(TABLES.physical_inventory_details_rfid, input);
}

export async function deletePhysicalInventoryDetailRfid(id: number): Promise<void> {
    await directusDeleteItem(TABLES.physical_inventory_details_rfid, id);
}

export async function deletePhysicalInventoryDetail(id: number): Promise<void> {
    await directusDeleteItem(TABLES.physical_inventory_details, id);
}

export async function fetchLatestCommittedCutoffDateByBranch(
    branchId: number,
): Promise<string | null> {
    const rows = await directusGetItems<PhysicalInventoryHeaderRow>(
        TABLES.physical_inventory,
        {
            filter: JSON.stringify({
                branch_id: { _eq: branchId },
                isComitted: { _eq: 1 },
                isCancelled: { _eq: 0 },
            }),
            fields: "id,cutOff_date",
            sort: "-cutOff_date,-id",
            limit: "1",
        },
    );

    return rows[0]?.cutOff_date ?? null;
}

export async function prepareLoadProductsData(input: {
    ph_id: number;
    branch_id: number;
    supplier_id: number;
    category_id: number;
    price_type_id: number;
}) {
    const [lookup, runningInventoryRows] = await Promise.all([
        fetchProductLookupBundle(),
        fetchRunningInventoryByBranch(input.branch_id),
    ]);

    const eligibleVariants = buildEligibleVariants({
        supplierId: input.supplier_id,
        categoryId: input.category_id,
        priceTypeId: input.price_type_id,
        lookup,
    });

    const branchScopedRunning = runningInventoryRows.filter(
        (row) => row.branch_id === input.branch_id,
    );

    const detail_payloads = buildPhysicalInventoryDetailPayloads({
        ph_id: input.ph_id,
        branch_id: input.branch_id,
        variants: eligibleVariants,
        runningInventoryRows: branchScopedRunning,
    });

    const grouped_preview = buildGroupedPhysicalInventoryRows({
        branch_id: input.branch_id,
        variants: eligibleVariants,
        details: [],
        runningInventoryRows: branchScopedRunning,
        ph_id: input.ph_id,
    });

    return {
        eligible_variants: eligibleVariants,
        detail_payloads,
        grouped_preview,
    };
}

export function resolveRunningInventoryFilterParams(input: {
    branchId: number;
    supplierId: number;
    categoryId: number;
    branches: BranchRow[];
    suppliers: SupplierRow[];
    lookup: ProductLookupBundle;
}): {
    branchName: string;
    supplierShortcut: string;
    productCategory?: string;
} {
    const branch = input.branches.find((row) => row.id === input.branchId);
    if (!branch?.branch_name?.trim()) {
        throw new Error("Unable to resolve branch name for running inventory filter.");
    }

    const supplier = input.suppliers.find((row) => row.id === input.supplierId);
    if (!supplier?.supplier_shortcut?.trim()) {
        throw new Error("Unable to resolve supplier shortcut for running inventory filter.");
    }

    const category = input.lookup.categories.find(
        (row) => row.category_id === input.categoryId,
    );
    if (!category?.category_name?.trim()) {
        throw new Error("Unable to resolve category name for running inventory filter.");
    }

    const isAllCategory = isAllCategoryName(category.category_name);

    return {
        branchName: branch.branch_name.trim(),
        supplierShortcut: supplier.supplier_shortcut.trim(),
        ...(isAllCategory ? {} : { productCategory: category.category_name.trim() }),
    };
}
function extractTrailingNumber(value: string): number | null {
    const match = value.trim().match(/(\d+)\s*$/);
    if (!match) return null;

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildNextPhNoFromLatest(latestPhNo: string | null | undefined): string {
    const lastNumber = latestPhNo ? extractTrailingNumber(latestPhNo) : null;
    const nextNumber = (lastNumber ?? 0) + 1;

    return `PH-${String(nextNumber).padStart(6, "0")}`;
}

export async function fetchNextPhysicalInventoryNumber(): Promise<string> {
    const rows = await directusGetItems<Pick<PhysicalInventoryHeaderRow, "id" | "ph_no">>(
        TABLES.physical_inventory,
        {
            fields: "id,ph_no",
            sort: "-id",
            limit: "1",
        },
    );

    const latest = rows[0] ?? null;
    return buildNextPhNoFromLatest(latest?.ph_no);
}