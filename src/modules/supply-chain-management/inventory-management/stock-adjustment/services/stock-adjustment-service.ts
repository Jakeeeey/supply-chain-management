import { directusFetch, getDirectusBase } from "@/lib/directus";
import { 
  StockAdjustmentHeader, 
  StockAdjustmentItem, 
  StockAdjustmentRFID,
  StockAdjustmentDetail,
  StockAdjustmentFormValues
} from "../types/stock-adjustment.schema";

const DIRECTUS_URL = getDirectusBase();
const SPRING_API_URL = process.env.SPRING_API_BASE_URL;

/**
 * Service for handling Stock Adjustment data interactions.
 */
export const stockAdjustmentService = {
  /**
   * Fetch all stock adjustment headers with optional filtering
   */
  async fetchAllHeaders(params?: { search?: string; branchId?: number; type?: string; status?: string }) {
    let query = `fields=*,branch_id.branch_name,branch_id.id,supplier_id.id,supplier_id.supplier_name,created_by.user_fname,created_by.user_lname,created_by.user_id,posted_by.user_fname,posted_by.user_lname,items.id,stock_adjustment.id&sort=-created_at`;
    
    const filters: any = {};
    if (params?.branchId) filters.branch_id = { _eq: params.branchId };
    if (params?.type) filters.type = { _eq: params.type };
    if (params?.status) {
        if (params.status === "Posted") filters.isPosted = { _eq: true };
        if (params.status === "Unposted") filters.isPosted = { _neq: true };
    }
    
    if (params?.search) {
        filters._or = [
            { doc_no: { _icontains: params.search } },
            { remarks: { _icontains: params.search } }
        ];
    }

    if (Object.keys(filters).length > 0) {
        query += `&filter=${JSON.stringify(filters)}`;
    }

    const res = await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_header?${query}`);
    const headers = res.data as StockAdjustmentHeader[];
    
    if (headers.length === 0) return [];

    // Fetch counts and amounts from items for these headers
    // Since some headers only link via doc_no, we fetch by doc_no list
    const docNos = headers.map(h => h.doc_no);
    const itemsRes = await directusFetch(
        `${DIRECTUS_URL}/items/stock_adjustment?filter={"doc_no":{"_in":${JSON.stringify(docNos)}}}&fields=doc_no,quantity,product_id.price_per_unit,product_id.cost_per_unit,unit_id.unit_name&limit=-1`
    );
    const allItems = itemsRes.data || [];

    // Group items by doc_no
    const itemsMap = new Map<string, any[]>();
    allItems.forEach((item: any) => {
        if (!itemsMap.has(item.doc_no)) itemsMap.set(item.doc_no, []);
        itemsMap.get(item.doc_no)!.push(item);
    });

    // Merge count and amount into headers
    return headers.map(header => {
        const headerItems = itemsMap.get(header.doc_no) || [];
        const totalAmount = headerItems.reduce((sum: number, item: any) => {
            const cost = item.product_id?.cost_per_unit || item.product_id?.price_per_unit || 0;
            return sum + ((item.quantity || 0) * cost);
        }, 0);

        return {
            ...header,
            items: headerItems, // This will have .length for the count
            amount: totalAmount > 0 ? totalAmount : (Number(header.amount) || 0)
        };
    });
  },

  /**
   * Fetch a single stock adjustment with all its items and RFID tags
   */
  async fetchById(id: number): Promise<StockAdjustmentDetail> {
    const headerRes = await directusFetch(
      `${DIRECTUS_URL}/items/stock_adjustment_header/${id}?fields=*,branch_id.id,branch_id.branch_name,supplier_id.id,supplier_id.supplier_name,created_by.*,posted_by.*`
    );
    const header = headerRes.data;

    const itemsRes = await directusFetch(
        `${DIRECTUS_URL}/items/stock_adjustment?filter={"doc_no":{"_eq":"${header.doc_no}"}}&fields=*,product_id.product_id,product_id.product_name,product_id.product_code,product_id.cost_per_unit,product_id.price_per_unit,product_id.unit_of_measurement.unit_name,product_id.unit_of_measurement.order,product_id.product_brand.brand_name,product_id.product_category.category_name,product_id.barcode,product_id.description,unit_id.unit_name&limit=-1`
    );
    const items = (itemsRes.data || []).map((item: any) => {
      const cost = item.cost_per_unit || item.product_id?.cost_per_unit || item.product_id?.price_per_unit || 0;
      return {
        ...item,
        product_name: item.product_id?.product_name,
        product_code: item.product_id?.product_code,
        cost_per_unit: cost,
        unit_name: item.unit_id?.unit_name || item.product_id?.unit_of_measurement?.unit_name || item.unit_name || "pcs",
        brand_name: item.product_id?.product_brand?.brand_name || item.brand_name || "N/A",
        category_name: item.product_id?.product_category?.category_name || "N/A"
      };
    });

    // --- Supplier Inference Logic ---
    // If supplier_id is missing from header, try to find it from the items' products
    const productIds = items.map((item: any) => item.product_id?.product_id || item.product_id).filter((id: any) => !isNaN(Number(id)));
    if (productIds.length > 0) {
      try {
        const ppsRes = await directusFetch(
          `${DIRECTUS_URL}/items/product_per_supplier?filter={"product_id":{"_in":${JSON.stringify(productIds)}}}&fields=product_id,supplier_id&limit=-1`
        );
        const ppsData = ppsRes.data || [];
        const productToSupplierMap = new Map();
        ppsData.forEach((pps: any) => {
          // Store the first supplier found for each product
          const pId = typeof pps.product_id === 'object' ? pps.product_id.id : pps.product_id;
          const sId = typeof pps.supplier_id === 'object' ? pps.supplier_id.id : pps.supplier_id;
          if (pId && sId && !productToSupplierMap.has(Number(pId))) {
            productToSupplierMap.set(Number(pId), Number(sId));
          }
        });

        // Attach inferred supplier ID to each item
        items.forEach((item: any) => {
          const pId = Number(item.product_id?.product_id || item.product_id);
          if (productToSupplierMap.has(pId)) {
            item.inferred_supplier_id = productToSupplierMap.get(pId);
          }
        });
      } catch (err) {
        console.error("Error inferring suppliers:", err);
      }
    }

    // Recalculate total amount from items for accuracy
    const totalAmount = items.reduce((sum: number, item: any) => {
        return sum + ((item.quantity || 0) * (item.cost_per_unit || 0));
    }, 0);

    // --- RFID Tag Recovery ---
    const itemIds = items.map((i: any) => i.id).filter((id: any) => id);
    let allRfidTags: any[] = [];
    if (itemIds.length > 0) {
      try {
        const rfidRes = await directusFetch(
          `${DIRECTUS_URL}/items/stock_adjustment_rfid?filter={"stock_adjustment_id":{"_in":${JSON.stringify(itemIds)}}}&limit=-1`
        );
        allRfidTags = rfidRes.data || [];
      } catch (err) {
        console.error("Error fetching RFID tags for items:", err);
      }
    }

    // Attach RFID tags to their respective items
    const itemsWithTags = items.map((item: any) => {
      const itemTags = allRfidTags
        .filter((t: any) => t.stock_adjustment_id === item.id)
        .map((t: any) => t.rfid_tag);
      return {
        ...item,
        rfid_tags: itemTags,
        rfid_count: itemTags.length
      };
    });

    return {
      ...header,
      items: itemsWithTags,
      amount: totalAmount > 0 ? totalAmount : (Number(header.amount) || 0),
    };
  },

  /**
   * Fetch current inventory for a product in a branch via Spring Boot API
   */
  async fetchProductInventory(productId: number, branchId: number, token: string): Promise<number> {
    try {
      let url = `${SPRING_API_URL}/api/view-running-inventory/all?branch_id=${branchId}`;
      
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) return 0;
      
      const data = await res.json();
      if (Array.isArray(data)) {
        const item = data.find((item: any) => item.product_id === productId);
        return item ? (item.running_inventory || 0) : 0;
      }
      return 0;
    } catch (error) {
      console.error("Failed to fetch product inventory:", error);
      return 0;
    }
  },

  /**
   * Pre-fetch ALL running inventory for a branch in a single call.
   * Returns a Map-friendly array of { product_id, running_inventory }.
   */
  async fetchBranchInventory(branchId: number, token: string): Promise<{ product_id: number; running_inventory: number }[]> {
    try {
      const url = `${SPRING_API_URL}/api/view-running-inventory/all?branch_id=${branchId}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return [];

      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          product_id: Number(item.product_id),
          running_inventory: Number(item.running_inventory || 0),
        }));
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch branch inventory:", error);
      return [];
    }
  },

  async fetchBranchRFIDStatus(branchId: number, token: string): Promise<any[]> {
    try {
      let url = `${SPRING_API_URL}/api/view-rfid-onhand?branchId=${branchId}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error("Failed to fetch branch RFID status:", error);
      return [];
    }
  },

  /**
   * Check if a product has RFID tags via Spring Boot API
   */
  async checkRFIDStatus(productId: number, branchId: number, token: string): Promise<any> {
    try {
      let url = `${SPRING_API_URL}/api/view-rfid-onhand?branchId=${branchId}`;
      
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) return false;
      
      const data = await res.json();
      // If data is returned for this product, return the match info
      if (Array.isArray(data)) {
        return data.find((item: any) => item.productId === productId) || null;
      }
      return null;
    } catch (error) {
      console.error("Failed to check RFID status:", error);
      return null;
    }
  },

  /**
   * Create a new Stock Adjustment (Header + Items)
   */
  async create(payload: { header: any; items: any[]; userId?: number }) {
    console.log("[SERVICE] Creating stock adjustment header with userId:", payload.userId);
    
    const { header, items } = payload;
    
    // 1. Create Header
    const headerRes = await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_header`, {
      method: "POST",
      body: JSON.stringify({
        doc_no: header.doc_no,
        branch_id: header.branch_id,
        supplier_id: header.supplier_id,
        type: header.type,
        remarks: header.remarks,
        amount: header.amount || items.reduce((acc: number, item: any) => acc + (item.quantity * (item.cost_per_unit || 0)), 0),
        isPosted: 0,
        created_by: payload.userId, // correctly assign the creating user
      }),
    });

    // 2. Create Items
    const itemsPayload = items.map((item: any) => ({
      doc_no: header.doc_no,
      product_id: Number(item.product_id),
      branch_id: Number(header.branch_id),
      type: header.type,
      quantity: Number(item.quantity),
      remarks: item.remarks,
      unit_id: item.unit_id ? Number(item.unit_id) : null
    }));

    const itemsRes = await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment`, {
      method: "POST",
      body: JSON.stringify(itemsPayload),
    });
    const createdItems = Array.isArray(itemsRes.data) ? itemsRes.data : [itemsRes.data];

    // 3. Create RFID tags linked to specific item IDs
    const rfidPayload: any[] = [];
    items.forEach((item: any, index: number) => {
      if (item.rfid_tags && Array.isArray(item.rfid_tags) && createdItems[index]) {
        const itemId = createdItems[index].id;
        item.rfid_tags.forEach((tag: string) => {
          rfidPayload.push({
            rfid_tag: tag,
            stock_adjustment_id: itemId, // This links to items table
          });
        });
      }
    });

    if (rfidPayload.length > 0) {
      await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_rfid`, {
        method: "POST",
        body: JSON.stringify(rfidPayload),
      });
    }

    return headerRes.data;
  },

  /**
   * Update an existing Stock Adjustment
   */
  async update(id: number, payload: any) {
    // 1. Update Header
    const headerPayload = {
      doc_no: payload.header.doc_no,
      type: payload.header.type,
      branch_id: Number(payload.header.branch_id),
      remarks: payload.header.remarks,
      supplier_id: payload.header.supplier_id ? Number(payload.header.supplier_id) : null,
      amount: Number(payload.header.amount),
    };

    await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_header/${id}`, {
      method: "PATCH",
      body: JSON.stringify(headerPayload),
    });

    // 2. Delete existing items (this also cascades to RFID table if configured)
    const existingItemsRes = await directusFetch(
        `${DIRECTUS_URL}/items/stock_adjustment?filter={"doc_no":{"_eq":"${payload.header.doc_no}"}}&fields=id`
    );
    const itemIds = existingItemsRes.data.map((i: any) => i.id);
    
    if (itemIds.length > 0) {
        await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment`, {
          method: "DELETE",
          body: JSON.stringify(itemIds),
        });
    }

    // 3. Recreate Items
    const itemsPayload = payload.items.map((item: any) => ({
      doc_no: payload.header.doc_no,
      product_id: Number(item.product_id),
      branch_id: Number(payload.header.branch_id),
      type: payload.header.type,
      quantity: Number(item.quantity),
      remarks: item.remarks,
      unit_id: item.unit_id ? Number(item.unit_id) : null
    }));

    const itemsRes = await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment`, {
      method: "POST",
      body: JSON.stringify(itemsPayload),
    });
    const createdItems = Array.isArray(itemsRes.data) ? itemsRes.data : [itemsRes.data];

    // 4. Recreate RFID tags link to specific item IDs
    const rfidPayload: any[] = [];
    payload.items.forEach((item: any, index: number) => {
      if (item.rfid_tags && Array.isArray(item.rfid_tags) && createdItems[index]) {
        const itemId = createdItems[index].id;
        item.rfid_tags.forEach((tag: string) => {
          rfidPayload.push({
            rfid_tag: tag,
            stock_adjustment_id: itemId,
          });
        });
      }
    });

    if (rfidPayload.length > 0) {
      await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_rfid`, {
        method: "POST",
        body: JSON.stringify(rfidPayload),
      });
    }

    return { success: true };
  },

  /**
   * Post (finalize) a Stock Adjustment
   */
  async postStockAdjustment(id: number, userId?: number) {
    console.log(`[SERVICE] Posting adjustment header ID: ${id} by userId: ${userId}`);
    const res = await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_header/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        isPosted: 1,
        posted_by: userId, // assign the posting user
        postedAt: new Date().toISOString()
      }),
    });
    console.log(`[SERVICE] Post result for ID ${id}:`, res);
    return res;
  },

  /**
   * Delete a draft Stock Adjustment
   */
  async deleteStockAdjustment(id: number) {
    // 0. Get the header first to find the doc_no for items and stock_adjustment_id for RFID
    const headerRes = await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_header/${id}?fields=doc_no,id`);
    const docNo = headerRes.data.doc_no;

    // 1. Delete associated items (linked by doc_no)
    const itemsRes = await directusFetch(
        `${DIRECTUS_URL}/items/stock_adjustment?filter={"doc_no":{"_eq":"${docNo}"}}&fields=id`
    );
    const itemIds = itemsRes.data.map((i: any) => i.id);
    if (itemIds.length > 0) {
        await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment`, {
          method: "DELETE",
          body: JSON.stringify(itemIds),
        });
    }

    // 2. Delete associated RFID tags (linked by stock_adjustment_id)
    const rfidRes = await directusFetch(
        `${DIRECTUS_URL}/items/stock_adjustment_rfid?filter={"stock_adjustment_id":{"_eq":${id}}}&fields=id`
    );
    const rfidIds = rfidRes.data.map((i: any) => i.id);
    if (rfidIds.length > 0) {
        await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_rfid`, {
          method: "DELETE",
          body: JSON.stringify(rfidIds),
        });
    }

    // 3. Delete Header
    await directusFetch(`${DIRECTUS_URL}/items/stock_adjustment_header/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Fetch all branches for the dropdown
   */
  async fetchBranches() {
    const res = await directusFetch(`${DIRECTUS_URL}/items/branches?fields=id,branch_name,branch_code&sort=branch_name`);
    return res.data;
  },

  /**
   * Fetch approved products (SKUs) for the dropdown
   */
  async fetchProducts(params?: { search?: string }) {
    let query = `fields=product_id,product_name,product_code,price_per_unit,cost_per_unit,barcode,description,unit_of_measurement.unit_name,unit_of_measurement.order,product_brand.brand_name&limit=100&sort=product_name`;
    
    const filters: any = {
      isActive: { _eq: 1 }
    };
    
    if (params?.search) {
      filters._or = [
        { product_name: { _icontains: params.search } },
        { product_code: { _icontains: params.search } },
        { barcode: { _icontains: params.search } }
      ];
    }
    
    query += `&filter=${JSON.stringify(filters)}`;
    
    const res = await directusFetch(`${DIRECTUS_URL}/items/products?${query}`);
    const products = res.data || [];
    
    // Map unit_name and brand_name from nested objects, and ensure id exists
    return products.map((p: any) => ({
      ...p,
      id: p.product_id,
      unit_name: p.unit_of_measurement?.unit_name || p.unit_name || "pcs",
      unit_id: p.unit_of_measurement?.unit_id || p.unit_id || null,
      brand_name: p.product_brand?.brand_name || p.brand_name || "N/A"
    }));
  },

  /**
   * Fetch active suppliers (nonBuy = 0) for the supplier dropdown.
   * nonBuy is a BIT(1) column — Directus returns it as a Buffer.
   * We filter nonBuy=0 (buyable) and sort alphabetically.
   */
  async fetchSuppliers() {
    const res = await directusFetch(
      `${DIRECTUS_URL}/items/suppliers?fields=id,supplier_name,supplier_shortcut,nonBuy&filter[nonBuy][_eq]=0&sort=supplier_name&limit=-1`
    );
    return (res.data || []).map((s: any) => ({
      id: s.id,
      supplier_name: s.supplier_name,
      supplier_shortcut: s.supplier_shortcut,
    }));
  },

  /**
   * Fetch all available units (UoM)
   */
  async fetchUnits() {
    const res = await directusFetch(`${DIRECTUS_URL}/items/units?fields=unit_id,unit_name,unit_shortcut,order&sort=unit_name&limit=-1`);
    return res.data || [];
  },

  /**
   * Fetch products linked to a specific supplier via the
   * product_per_supplier junction table.
   *
   * Connection logic (from DB view):
   *   COALESCE(child.parent_id, child.product_id) = pps.product_id
   * i.e. if a product has a parent_id, use parent_id to match; otherwise product_id.
   *
   * Steps:
   *  1. Get all product_ids from product_per_supplier for this supplier
   *  2. Fetch products where product_id IN those ids OR parent_id IN those ids
   */
  async fetchProductsBySupplier(supplierId: number, search?: string) {
    // 1. Get the product IDs linked to this supplier
    const ppsRes = await directusFetch(
      `${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`
    );
    const supplierProductIds: number[] = (ppsRes.data || []).map((r: any) => r.product_id);

    if (supplierProductIds.length === 0) return [];

    // 2. Fetch products where product_id is in the list OR parent_id is in the list
    //    This covers both parent products and child variants
    const filters: any = {
      _and: [
        { isActive: { _eq: 1 } },
        {
          _or: [
            { product_id: { _in: supplierProductIds } },
            { parent_id: { _in: supplierProductIds } },
          ],
        },
      ],
    };

    // Add search filter if provided
    if (search) {
      filters._and.push({
        _or: [
          { product_name: { _icontains: search } },
          { product_code: { _icontains: search } },
          { barcode: { _icontains: search } },
        ],
      });
    }

    const query = `fields=product_id,product_name,product_code,price_per_unit,cost_per_unit,barcode,description,unit_of_measurement.unit_name,unit_of_measurement.order,product_brand.brand_name&limit=500&sort=product_name&filter=${JSON.stringify(filters)}`;
    const res = await directusFetch(`${DIRECTUS_URL}/items/products?${query}`);
    const products = res.data || [];

    return products.map((p: any) => ({
      ...p,
      id: p.product_id,
      unit_name: p.unit_of_measurement?.unit_name || p.unit_name || "pcs",
      unit_id: p.unit_of_measurement?.unit_id || p.unit_id || null,
      brand_name: p.product_brand?.brand_name || p.brand_name || "N/A",
    }));
  },

  /**
   * Fetch the next available document number for a given adjustment type.
   * Format: SAIN-YYYY-NNN or SAOUT-YYYY-NNN
   */
  async fetchNextDocNo(type: "IN" | "OUT"): Promise<string> {
    const prefix = type === "IN" ? "SAIN" : "SAOUT";
    const year = new Date().getFullYear();
    const searchPrefix = `${prefix}-${year}-`;

    // Query for the latest doc_no for this prefix and year
    // We sort descending by doc_no and limit to 1
    const query = `filter[doc_no][_eq]=${searchPrefix}&fields=doc_no&sort=-doc_no&limit=1`;
    // Note: [_eq] for partial match is not correct in Directus filter, 
    // we should use [_starts_with] or [_icontains]
    const res = await directusFetch(
      `${DIRECTUS_URL}/items/stock_adjustment_header?filter[doc_no][_starts_with]=${searchPrefix}&fields=doc_no&sort=-doc_no&limit=1`
    );

    const latest = res.data?.[0]?.doc_no;
    let nextNumber = 1;

    if (latest) {
      // Split by dash and get the last part
      const parts = latest.split("-");
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1;
      }
    }

    // Format with padding: 001, 002, etc.
    return `${searchPrefix}${nextNumber.toString().padStart(3, "0")}`;
  },
};
