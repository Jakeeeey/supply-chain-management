import { useState, useEffect } from "react";
import { SalesReturn } from "../type";
import { SalesReturnProvider } from "../providers/fetchProviders";

export function useSalesReturnList() {
  const [data, setData] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [options, setOptions] = useState<{
    salesmen: { value: string; label: string }[];
    customers: { value: string; label: string }[];
  }>({
    salesmen: [],
    customers: [],
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    salesman: "All",
    customer: "All",
    status: "All",
  });

  // Helper: Normalize to ensure "MAIN - 123" matches "MAIN-123"
  const normalize = (str: string) => {
    if (!str) return "";
    return str.replace(/\s+/g, "").toUpperCase();
  };

  const refresh = async () => {
    setLoading(true);
    try {
      // 1. Determine if we're searching (hybrid strategy)
      const isSearching = search.trim().length > 0;

      // 2. Fetch Returns, Customers, and Salesmen in parallel
      // When searching: fetch ALL returns (limit=-1) so we can filter by name client-side
      // When not searching: use normal server-side pagination
      const [returnsResult, customersList, salesmenList] = await Promise.all([
        SalesReturnProvider.getReturns(
          isSearching ? 1 : page,
          isSearching ? -1 : 10,
          "",  // search is no longer passed to the provider
          filters,
        ),
        SalesReturnProvider.getCustomersList(),
        SalesReturnProvider.getSalesmenList(),
      ]);

      // 3. Update Options State (for Filter Dropdowns)
      setOptions({
        salesmen: salesmenList,
        customers: customersList,
      });

      // 4. Create Lookup Maps (Normalizing Keys)
      const customerMap = new Map<string, string>();
      customersList.forEach((c) => {
        customerMap.set(normalize(c.value), c.label);
      });

      const salesmanMap = new Map<string, string>();
      salesmenList.forEach((s) => {
        salesmanMap.set(s.value.toString(), s.label);
      });

      // 5. Map Names into Data (enrich with resolved names)
      let mappedData = returnsResult.data.map((item) => {
        const cleanCustomerCode = normalize(item.customerCode);
        const customerName = customerMap.get(cleanCustomerCode);
        const salesmanName = salesmanMap.get(item.salesmanId.toString());

        return {
          ...item,
          customerName: customerName || item.customerCode,
          salesmanName: salesmanName || `ID: ${item.salesmanId}`,
        };
      });

      // 6. Client-side search filtering (AFTER names are resolved)
      if (isSearching) {
        const lowerSearch = search.toLowerCase().trim();
        mappedData = mappedData.filter((item) => {
          const matchReturn = item.returnNo
            ?.toLowerCase()
            .includes(lowerSearch);
          const matchCustomerName = item.customerName
            ?.toLowerCase()
            .includes(lowerSearch);
          const matchCustomerCode = item.customerCode
            ?.toLowerCase()
            .includes(lowerSearch);
          const matchSalesmanName = item.salesmanName
            ?.toLowerCase()
            .includes(lowerSearch);
          return (
            matchReturn ||
            matchCustomerName ||
            matchCustomerCode ||
            matchSalesmanName
          );
        });

        // Local pagination after filtering
        const totalFiltered = mappedData.length;
        const pageSize = 10;
        const start = (page - 1) * pageSize;
        const paginatedData = mappedData.slice(start, start + pageSize);

        setData(paginatedData);
        setTotalPages(Math.max(1, Math.ceil(totalFiltered / pageSize)));
      } else {
        // Normal server-paginated result
        setData(mappedData);
        setTotalPages(Math.max(1, Math.ceil(returnsResult.total / 10)));
      }
    } catch (err) {
      console.error("Error fetching sales return list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  useEffect(() => {
    refresh();
  }, [page, search, filters]);

  return {
    data,
    loading,
    page,
    totalPages,
    setPage,
    setSearch,
    setFilters,
    filters,
    refresh,
    options,
  };
}
