/* eslint-disable @typescript-eslint/no-explicit-any */
import { directusGet } from "./sales-return.client";

export async function getRawLinkedInvoice(returnId: number) {
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_invoice_sales_return?filter[return_no][_eq]=${returnId}&fields=invoice_no.invoice_no`,
  );
}

export async function getRawReferences() {
  return Promise.all([
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/salesman?limit=-1&fields=id,salesman_name,salesman_code,price_type,branch_code&filter[isActive][_eq]=1&filter[division_id][_eq]=1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/customer?limit=-1&fields=id,customer_code,customer_name,store_name,discount_type&filter[isActive][_eq]=1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/branches?limit=-1&fields=id,branch_name",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/discount_type?limit=-1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/sales_return_type?limit=-1",
    ),
  ]);
}

export async function getRawLinePerDiscountType() {
  return directusGet<{ data: Record<string, unknown>[] }>(
    "/items/line_per_discount_type?limit=-1&fields=id,type_id,line_id",
  );
}

export async function getRawLineDiscounts() {
  return directusGet<{ data: Record<string, unknown>[] }>(
    "/items/line_discount?limit=-1&fields=id,line_discount,percentage",
  );
}

export async function getRawProductCatalog() {
  return Promise.all([
    directusGet<{ data: Record<string, unknown>[] }>("/items/brand?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>("/items/categories?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>("/items/suppliers?limit=-1&filter[division_id][_eq]=1"),
    directusGet<{ data: Record<string, unknown>[] }>("/items/units?limit=-1"),
    directusGet<{ data: Record<string, unknown>[] }>(
      "/items/product_per_supplier?limit=-1",
    ),
    directusGet<{ data: Record<string, unknown>[] }>("/items/products?limit=-1&filter[isActive][_eq]=1&fields=*,is_serialized"),
  ]);
}

export async function getRawSupplierCategoryDiscount(customerCode: string) {
  if (!customerCode) return { data: [] };
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/supplier_category_discount_per_customer?limit=-1&filter[customer_code][_eq]=${encodeURIComponent(customerCode)}&filter[deleted_at][_null]=true`
  );
}

export async function getRawInvoices(salesmanId?: string, customerCode?: string) {
  let url =
    "/items/sales_invoice?limit=-1&fields=invoice_id,invoice_no,order_id,customer_code,salesman_id,total_amount";

  if (salesmanId) {
    url += `&filter[salesman_id][_eq]=${salesmanId}`;
  }
  if (customerCode) {
    url += `&filter[customer_code][_eq]=${encodeURIComponent(customerCode)}`;
  }

  return directusGet<{ data: Record<string, unknown>[] }>(url);
}

export async function getRawUnits() {
  return directusGet<{ data: Record<string, unknown>[] }>("/items/units?limit=-1");
}

export async function getRawSerialOnHand(
  serial: string,
  branchId: number,
  token: string,
): Promise<any[]> {
  const baseUrl = process.env.SPRING_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return [];

  const inputSerial = serial.trim().toUpperCase();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v-serial-onhand/all?serialNumber=${encodeURIComponent(inputSerial)}`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.ok) {
      const raw = await res.json();
      const items = Array.isArray(raw) ? raw : (raw.data || raw.content || []);
      
      return items.filter((i: any) => 
        String(i.serialNumber || i.serial_number || "").trim().toUpperCase() === inputSerial
      );
    }

    return [];
  } catch (error) {
    console.error("[Sales Return Repo] Serial check failed:", error);
    return [];
  }
}

export async function getRawPriceTypes() {
  return directusGet<{ data: Record<string, unknown>[] }>(
    "/items/price_types?limit=-1&sort=sort",
  );
}

export async function getJunctionLink(returnId: number) {
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_invoice_sales_return?filter[return_no][_eq]=${returnId}`,
  );
}

export async function getSerialsByDetailId(detailId: number) {
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_return_serial?filter[sales_return_detail_id][_eq]=${detailId}&limit=-1`,
  );
}

export async function getRawSerialsByDetailIds(detailIds: number[]) {
  if (detailIds.length === 0) return { data: [] };
  const filterIds = detailIds.join(',');
  return directusGet<{ data: Record<string, unknown>[] }>(
    `/items/sales_return_serial?filter[sales_return_detail_id][_in]=${filterIds}&limit=-1`,
  );
}

export async function checkSerialDuplicate(serialNumber: string) {
  const serial = serialNumber.trim().toUpperCase();
  const encoded = encodeURIComponent(serial);
  const encodedLower = encodeURIComponent(serial.toLowerCase());
  
  const paths = [
    `/items/sales_return_serial?filter[serial_number][_eq]=${encoded}&fields=id,serial_number,sales_return_detail_id.*,sales_return_detail_id.sales_return_id.*&limit=1`,
    `/items/sales_return_serial?filter[serial_number][_eq]=${encodedLower}&fields=id,serial_number,sales_return_detail_id.*,sales_return_detail_id.sales_return_id.*&limit=1`,
    `/items/sales_return_serial?filter[serial_number][_icontains]=${encoded}&fields=id,serial_number,sales_return_detail_id.*,sales_return_detail_id.sales_return_id.*&limit=1`
  ];

  for (const path of paths) {
    try {
      const res = await directusGet<{ data: any[] }>(path).catch(() => ({ data: [] }));
      if (res?.data?.length > 0) {
        const match = res.data.find(i => String(i.serial_number || "").trim().toUpperCase() === serial);
        if (match) return { data: [match] };
      }
    } catch (err) {
      console.warn(`Duplicate check failed for path ${path}:`, err);
    }
  }

  return { data: [] };
}

export async function getRawProductById(productId: number) {
  return directusGet<{ data: Record<string, unknown> }>(
    `/items/products/${productId}?fields=product_id,product_code,product_name,description,priceA,priceB,priceC,priceD,priceE,unit_of_measurement,unit_of_measurement_count,is_serialized`,
  );
}
