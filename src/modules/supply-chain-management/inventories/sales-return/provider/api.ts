/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SalesReturn,
  SalesReturnItem,
  Brand,
  Category,
  Supplier,
  Unit,
  Product,
  ProductSupplierConnection,
  API_LineDiscount,
  API_SalesReturnType,
  API_SalesReturnDetail,
  SalesReturnStatusCard,
  SalesmanOption,
  CustomerOption,
  BranchOption,
  InvoiceOption,
} from "../type";

const API_BASE = "/api/items";

const getHeaders = () => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token");

    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

const parseBoolean = (val: any): boolean => {
  if (typeof val === "number") return val === 1;
  if (val && val.type === "Buffer" && Array.isArray(val.data)) {
    return val.data[0] === 1;
  }
  return val === true;
};

const formatDateForAPI = (dateString: string | Date) => {
  try {
    if (!dateString) return new Date().toISOString().split("T")[0];
    return new Date(dateString).toISOString().split("T")[0];
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
};

const cleanId = (id: any) => {
  if (id === null || id === undefined || id === "") return null;
  const num = Number(id);
  return isNaN(num) ? id : num;
};

const normalizeCode = (code: string) => {
  return code ? code.replace(/\s+/g, "").toUpperCase() : "";
};

export const SalesReturnProvider = {
  // --- 1. MAIN LIST & FILTERING ---
  async getReturns(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    filters: { salesman?: string; customer?: string; status?: string } = {},
  ): Promise<{ data: SalesReturn[]; total: number }> {
    try {
      const allowedFields =
        "return_id,return_number,invoice_no,customer_code,salesman_id,total_amount,status,return_date,remarks,order_id,isThirdParty,created_at,price_type";

      let url = `${API_BASE}/sales_return?page=${page}&limit=${limit}&meta=filter_count&fields=${allowedFields}&sort=-return_id`;

      // NOTE: Search is NOT applied server-side here because the API only stores
      // customer_code and salesman_id — not names. The hook handles search
      // client-side after enriching rows with resolved customer/salesman names.

      if (filters.salesman && filters.salesman !== "All")
        url += `&filter[salesman_id][_eq]=${filters.salesman}`;
      if (filters.customer && filters.customer !== "All")
        url += `&filter[customer_code][_eq]=${encodeURIComponent(filters.customer)}`;
      if (filters.status && filters.status !== "All")
        url += `&filter[status][_eq]=${filters.status}`;

      const response = await fetch(url, {
        headers: getHeaders(),
        cache: "no-store",
      });
      if (!response.ok) return { data: [], total: 0 };

      const result = await response.json();
      const mappedData: SalesReturn[] = (result.data || []).map((item: any) => ({
        id: item.return_id,
        returnNo: item.return_number,
        invoiceNo: item.invoice_no,
        customerCode: item.customer_code,
        salesmanId: item.salesman_id,
        returnDate: item.return_date
          ? new Date(item.return_date).toLocaleDateString()
          : "N/A",
        totalAmount: parseFloat(item.total_amount) || 0,
        status: item.status || "Pending",
        remarks: item.remarks,
        orderNo: item.order_id || "",
        isThirdParty: parseBoolean(item.isThirdParty),
        priceType: item.price_type || "-",
        createdAt: item.created_at
          ? new Date(item.created_at).toLocaleDateString()
          : "-",
      }));

      return { data: mappedData, total: result.meta?.filter_count || 0 };
    } catch (error) {
      console.error("Provider Error (getReturns):", error);
      throw error;
    }
  },

  // --- 2. DROPDOWN HELPERS (Filters) ---
  async getSalesmenList(): Promise<
    { value: string; label: string; code: string; branch: string }[]
  > {
    try {
      const [salesmanRes, branchRes] = await Promise.all([
        fetch(
          `${API_BASE}/salesman?limit=-1&fields=id,salesman_name,salesman_code,branch_code`,
          { headers: getHeaders() },
        ),
        fetch(`${API_BASE}/branches?limit=-1&fields=id,branch_name`, {
          headers: getHeaders(),
        }),
      ]);

      if (!salesmanRes.ok || !branchRes.ok) return [];

      const salesmenData = (await salesmanRes.json()).data || [];
      const branchesData = (await branchRes.json()).data || [];

      return salesmenData.map((item: any) => {
        const matchedBranch = branchesData.find(
          (b: any) => b.id === item.branch_code,
        );
        return {
          value: item.id.toString(),
          label: item.salesman_name,
          code: item.salesman_code || "N/A",
          branch: matchedBranch ? matchedBranch.branch_name : "N/A",
        };
      });
    } catch (error) {
      return [];
    }
  },

  async getCustomersList(): Promise<{ value: string; label: string }[]> {
    try {
      const response = await fetch(
        `${API_BASE}/customer?limit=-1&fields=id,customer_code,customer_name`,
        { headers: getHeaders() },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        value: item.customer_code,
        label: item.customer_name,
      }));
    } catch (error) {
      return [];
    }
  },

  // --- 3. FORM HELPERS (Create/Edit) ---
  async getFormSalesmen(): Promise<SalesmanOption[]> {
    try {
      const response = await fetch(
        `${API_BASE}/salesman?limit=-1&fields=id,salesman_name,salesman_code,price_type,branch_code`,
        { headers: getHeaders() },
      );
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        name: item.salesman_name,
        code: item.salesman_code,
        priceType: item.price_type || "A",
        branchId: item.branch_code,
      }));
    } catch (error) {
      return [];
    }
  },

  async getFormCustomers(): Promise<CustomerOption[]> {
    try {
      const response = await fetch(
        `${API_BASE}/customer?limit=-1&fields=id,store_name,customer_name,customer_code`,
        { headers: getHeaders() },
      );
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        name: item.customer_name || item.store_name,
        code: item.customer_code,
      }));
    } catch (error) {
      return [];
    }
  },

  async getFormBranches(): Promise<BranchOption[]> {
    try {
      const response = await fetch(
        `${API_BASE}/branches?limit=-1&fields=id,branch_name`,
        { headers: getHeaders() },
      );
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        name: item.branch_name,
      }));
    } catch (error) {
      return [];
    }
  },

  async getInvoiceReturnList(customerCode?: string): Promise<InvoiceOption[]> {
    const targetCode = customerCode ? normalizeCode(customerCode) : "";
    const baseUrl = `${API_BASE}/sales_invoice?limit=-1&fields=invoice_id,invoice_no,customer_code,isPosted,total_amount&filter[isPosted][_null]=true`;

    const queryUrl = targetCode
      ? `${baseUrl}&filter[customer_code][_contains]=${encodeURIComponent(targetCode)}`
      : baseUrl;

    try {
      const response = await fetch(queryUrl, { headers: getHeaders() });

      if (!response.ok) {
        console.error(`[API] Error fetching invoices: ${response.status}`);
        return [];
      }

      const result = await response.json();
      const rawData = result.data || [];

      const uniqueInvoices = new Map();
      rawData.forEach((item: any) => {
        if (item.invoice_no && !uniqueInvoices.has(item.invoice_no)) {
          uniqueInvoices.set(item.invoice_no, {
            id: item.invoice_id,
            invoice_no: item.invoice_no.toString(),
            customerCode: item.customer_code || "",
            isPosted: item.isPosted,
            amount: item.total_amount ? parseFloat(item.total_amount) : 0,
          });
        }
      });
      return Array.from(uniqueInvoices.values());
    } catch (error) {
      console.error("[API] Failed to load invoices:", error);
      return [];
    }
  },

  // --- 4. PRODUCT LOOKUP HELPERS (The Missing Part) ---
  async getBrands(): Promise<Brand[]> {
    try {
      const response = await fetch(`${API_BASE}/brand?limit=-1`, {
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE}/categories?limit=-1`, {
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch(`${API_BASE}/suppliers?limit=-1`, {
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },

  async getUnits(): Promise<Unit[]> {
    try {
      const response = await fetch(`${API_BASE}/units?limit=-1`, {
        headers: getHeaders(),
      });
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },

  async getProductSupplierConnections(): Promise<ProductSupplierConnection[]> {
    try {
      const response = await fetch(
        `${API_BASE}/product_per_supplier?limit=-1`,
        { headers: getHeaders() },
      );
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        supplier_id: item.supplier_id,
        product_id:
          typeof item.product_id === "object"
            ? item.product_id.product_id
            : item.product_id,
      }));
    } catch (error) {
      return [];
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const url = `${API_BASE}/products?limit=-1`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },


  async getLineDiscounts(): Promise<API_LineDiscount[]> {
    try {
      const response = await fetch(`${API_BASE}/line_discount?limit=-1`, {
        headers: getHeaders(),
      });
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },

  async getSalesReturnTypes(): Promise<API_SalesReturnType[]> {
    try {
      const response = await fetch(`${API_BASE}/sales_return_type?limit=-1`, {
        headers: getHeaders(),
      });
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      return [];
    }
  },

  // --- 5. CRUD OPERATIONS ---
  async submitReturn(payload: any): Promise<any> {
    try {
      const totalGross = payload.items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.quantity) * Number(item.unitPrice),
        0,
      );

      // Fetch line discounts to calculate discount amounts from percentage
      const lineDiscounts = await SalesReturnProvider.getLineDiscounts();
      const lineDiscountMap = new Map<number, number>();
      lineDiscounts.forEach((ld) =>
        lineDiscountMap.set(ld.id, parseFloat(ld.percentage) || 0),
      );

      const totalDiscount = payload.items.reduce(
        (sum: number, item: any) => {
          const gross = Number(item.quantity) * Number(item.unitPrice);
          const discId = item.discountType ? Number(item.discountType) : null;
          const percentage = discId ? (lineDiscountMap.get(discId) || 0) : 0;
          return sum + gross * (percentage / 100);
        },
        0,
      );
      const formattedDate = formatDateForAPI(payload.returnDate);
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const shortTimestamp = Math.floor(Date.now() / 1000)
        .toString()
        .slice(-4);
      const generatedReturnNo = `SR-${shortTimestamp}-${uniqueSuffix}`;

      const headerPayload = {
        return_number: generatedReturnNo,
        gross_amount: totalGross,
        discount_amount: totalDiscount,
        created_by: 205,
        invoice_no: payload.invoiceNo || "",
        customer_code: payload.customer || payload.customerCode,
        salesman_id: cleanId(payload.salesmanId),
        total_amount: payload.totalAmount,
        status: "Pending",
        return_date: formattedDate,
        price_type: payload.priceType || "A",
        remarks: payload.remarks || "Created via Web App",
        order_id: payload.orderNo || "",
        isThirdParty: payload.isThirdParty ? 1 : 0,
      };

      const headerResponse = await fetch(`${API_BASE}/sales_return`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(headerPayload),
      });
      if (!headerResponse.ok) throw new Error(await headerResponse.text());
      const headerResult = await headerResponse.json();
      const finalReturnNo =
        headerResult.data?.return_number || generatedReturnNo;
      const returnTypes = await SalesReturnProvider.getSalesReturnTypes();

      const detailPromises = payload.items.map(async (item: any) => {
        const matchedType = returnTypes.find(
          (t: API_SalesReturnType) => t.type_name === item.returnType,
        );
        const typeId = matchedType
          ? matchedType.type_id
          : returnTypes[0]?.type_id || 1;

        const gross = Number(item.quantity) * Number(item.unitPrice);
        const discId = item.discountType && item.discountType !== ""
          ? Number(item.discountType)
          : null;
        const percentage = discId ? (lineDiscountMap.get(discId) || 0) : 0;
        const discountAmt = gross * (percentage / 100);

        const detailPayload = {
          return_no: finalReturnNo,
          product_id: Number(item.productId || item.product_id || item.id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          gross_amount: gross,
          discount_amount: discountAmt,
          total_amount: gross - discountAmt,
          sales_return_type_id: typeId,
          discount_type: discId,
          reason: item.reason || null,
        };
        const res = await fetch(`${API_BASE}/sales_return_details`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(detailPayload),
        });
        return { ok: res.ok };
      });
      await Promise.all(detailPromises);
      return headerResult;
    } catch (error: any) {
      throw error;
    }
  },

  async updateReturn(payload: {
    returnId: number;
    returnNo: string;
    items: any[];
    remarks: string;
    invoiceNo?: string;
    orderNo?: string;
    appliedInvoiceId?: number;
    isThirdParty?: boolean;
  }): Promise<any> {
    try {
      const totalGross = payload.items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.quantity) * Number(item.unitPrice),
        0,
      );

      // Fetch line discounts to calculate discount amounts from percentage
      const lineDiscounts = await SalesReturnProvider.getLineDiscounts();
      const lineDiscountMap = new Map<number, number>();
      lineDiscounts.forEach((ld) =>
        lineDiscountMap.set(ld.id, parseFloat(ld.percentage) || 0),
      );

      const totalDiscount = payload.items.reduce(
        (sum: number, item: any) => {
          const gross = Number(item.quantity) * Number(item.unitPrice);
          const discId = item.discountType &&
            item.discountType !== "No Discount" &&
            item.discountType !== ""
            ? Number(item.discountType)
            : null;
          const percentage = discId ? (lineDiscountMap.get(discId) || 0) : 0;
          return sum + gross * (percentage / 100);
        },
        0,
      );
      const totalNet = totalGross - totalDiscount;

      const headerPayload = {
        remarks: payload.remarks ?? "",
        gross_amount: totalGross,
        discount_amount: totalDiscount,
        total_amount: totalNet,
        invoice_no: payload.invoiceNo ?? "",
        order_id: payload.orderNo ?? "",
        isThirdParty: payload.isThirdParty ? 1 : 0,
      };

      const headerResponse = await fetch(
        `${API_BASE}/sales_return/${payload.returnId}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify(headerPayload),
        },
      );

      if (!headerResponse.ok) throw new Error(await headerResponse.text());
      const serverResult = await headerResponse.json();
      const updatedHeader = serverResult.data;

      // Handle Junction Table
      if (payload.appliedInvoiceId) {
        const checkLinkUrl = `${API_BASE}/sales_invoice_sales_return?filter[return_no][_eq]=${payload.returnId}`;
        const checkRes = await fetch(checkLinkUrl, { headers: getHeaders() });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const existingLinks = checkData.data || [];

          if (existingLinks.length > 0) {
            const linkId = existingLinks[0].id;
            await fetch(`${API_BASE}/sales_invoice_sales_return/${linkId}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({
                invoice_no: payload.appliedInvoiceId,
                linked_by: 205,
              }),
            });
          } else {
            await fetch(`${API_BASE}/sales_invoice_sales_return`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({
                return_no: payload.returnId,
                invoice_no: payload.appliedInvoiceId,
                linked_by: 205,
              }),
            });
          }
        }
      }

      const returnTypes = await SalesReturnProvider.getSalesReturnTypes();
      const currentItems = await SalesReturnProvider.getProductsSummary(
        payload.returnId,
        payload.returnNo,
      );
      const payloadIds = payload.items
        .filter((item: any) => typeof item.id === "number")
        .map((item: any) => item.id);

      const itemsToDelete = currentItems.filter(
        (dbItem) => !payloadIds.includes(dbItem.id),
      );
      for (const item of itemsToDelete) {
        if (item.id)
          await fetch(`${API_BASE}/sales_return_details/${item.id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
      }

      for (const item of payload.items) {
        const matchedType = returnTypes.find(
          (t: API_SalesReturnType) => t.type_name === item.returnType,
        );
        const typeId = matchedType
          ? matchedType.type_id
          : returnTypes[0]?.type_id || 1;

        const gross = Number(item.quantity) * Number(item.unitPrice);
        const discId = item.discountType &&
          item.discountType !== "No Discount" &&
          item.discountType !== ""
          ? Number(item.discountType)
          : null;
        const percentage = discId ? (lineDiscountMap.get(discId) || 0) : 0;
        const discountAmt = gross * (percentage / 100);

        const detailPayload = {
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          gross_amount: gross,
          discount_amount: discountAmt,
          total_amount: gross - discountAmt,
          sales_return_type_id: typeId,
          discount_type: discId,
          reason: item.reason || null,
        };

        if (typeof item.id === "string" && item.id.startsWith("added-")) {
          await fetch(`${API_BASE}/sales_return_details`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              ...detailPayload,
              return_no: payload.returnNo,
              product_id: Number(item.productId || item.product_id),
            }),
          });
        } else {
          await fetch(`${API_BASE}/sales_return_details/${item.id}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(detailPayload),
          });
        }
      }
      return updatedHeader;
    } catch (error) {
      throw error;
    }
  },

  async updateStatus(id: number | string, status: string): Promise<any> {
    try {
      const payload = { status: status };
      const response = await fetch(`${API_BASE}/sales_return/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  async getProductsSummary(
    id: string | number,
    returnString?: string,
  ): Promise<SalesReturnItem[]> {
    try {
      if (!returnString) return [];
      const filters = [];
      let orIndex = 0;
      filters.push(
        `filter[_or][${orIndex}][return_no][_eq]=${encodeURIComponent(returnString)}`,
      );

      const searchUrl = `${API_BASE}/sales_return_details?filter[return_no][_eq]=${encodeURIComponent(returnString)}&fields=*,product_id.*&limit=-1`;

      const [detailsRes, units, lineDiscounts, returnTypes] = await Promise.all(
        [
          fetch(searchUrl, { headers: getHeaders(), cache: "no-store" }).then(
            (r) => r.json(),
          ),
          SalesReturnProvider.getUnits(),
          SalesReturnProvider.getLineDiscounts(),
          SalesReturnProvider.getSalesReturnTypes(),
        ],
      );

      const rawItems = detailsRes.data || [];
      return rawItems.map((detail: any) => {
        const product =
          typeof detail.product_id === "object" && detail.product_id !== null
            ? detail.product_id
            : {
              product_code: "N/A",
              product_name: `Unknown (ID: ${detail.product_id})`,
            };
        const unitId =
          typeof product.unit_of_measurement === "object"
            ? product.unit_of_measurement?.unit_id
            : product.unit_of_measurement;
        const unit = units.find((u: Unit) => u.unit_id === unitId);
        const returnTypeObj = returnTypes.find(
          (rt: API_SalesReturnType) =>
            rt.type_id == detail.sales_return_type_id,
        );

        return {
          id: detail.detail_id || detail.id,
          productId: product.product_id,
          code: product.product_code || "N/A",
          description:
            product.product_name || product.description || "Unknown Item",
          unit: unit ? unit.unit_shortcut : "Pcs",
          quantity: Number(detail.quantity),
          unitPrice: Number(detail.unit_price),
          grossAmount: Number(detail.gross_amount),
          discountType: detail.discount_type
            ? Number(detail.discount_type)
            : "",
          discountAmount: (() => {
            const discId = detail.discount_type ? Number(detail.discount_type) : null;
            if (!discId) return 0;
            const disc = lineDiscounts.find((ld: API_LineDiscount) => ld.id === discId);
            if (!disc) return 0;
            const percentage = parseFloat(disc.percentage) || 0;
            const gross = Number(detail.quantity) * Number(detail.unit_price);
            return Math.round(gross * (percentage / 100) * 100) / 100;
          })(),
          totalAmount: (() => {
            const gross = Number(detail.quantity) * Number(detail.unit_price);
            const discId = detail.discount_type ? Number(detail.discount_type) : null;
            if (!discId) return gross;
            const disc = lineDiscounts.find((ld: API_LineDiscount) => ld.id === discId);
            if (!disc) return gross;
            const percentage = parseFloat(disc.percentage) || 0;
            return Math.round((gross - gross * (percentage / 100)) * 100) / 100;
          })(),
          reason: detail.reason || "",
          sales_return_type_id: detail.sales_return_type_id
            ? Number(detail.sales_return_type_id)
            : "",
          returnType: returnTypeObj ? returnTypeObj.type_name : "Good Order",
        };
      });
    } catch {
      return [];
    }
  },

  async getStatusCardData(
    returnId: number,
  ): Promise<SalesReturnStatusCard | null> {
    try {
      const fields =
        "return_id,isApplied,updated_at,status,isPosted,isReceived,order_id";
      const url = `${API_BASE}/sales_return/${returnId}?fields=${fields}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) return null;
      const result = await response.json();
      const data = result.data;

      // Fetch Linked Invoice
      let appliedToText = "-";
      const linkUrl = `${API_BASE}/sales_invoice_sales_return?filter[return_no][_eq]=${returnId}&fields=invoice_no.invoice_no`;
      const linkRes = await fetch(linkUrl, { headers: getHeaders() });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData.data && linkData.data.length > 0) {
          const linkedRec = linkData.data[0];
          if (linkedRec.invoice_no && linkedRec.invoice_no.invoice_no) {
            appliedToText = linkedRec.invoice_no.invoice_no;
          }
        }
      }

      return {
        returnId: data.return_id,
        isApplied: data.isApplied === 1,
        dateApplied: data.updated_at
          ? new Date(data.updated_at).toLocaleDateString()
          : "-",
        transactionStatus: data.status || "Closed",
        isPosted: parseBoolean(data.isPosted),
        isReceived: parseBoolean(data.isReceived),
        appliedTo: appliedToText,
      };
    } catch (error) {
      return null;
    }
  },
};
export type { SalesmanOption, BranchOption, CustomerOption };
