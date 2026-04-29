"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  HeaderGroup,
  Header,
  Row,
  Cell,
  PaginationState,
  Updater,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Settings2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyPlaceholder } from "@/components/shared/EmptyPlaceholder";

interface SearchInputProps {
  placeholder: string;
  initialValue: string;
  onSearch: (value: string) => void;
  isLoading?: boolean;
}

function SearchInput({
  placeholder,
  initialValue,
  onSearch,
  isLoading = false,
}: SearchInputProps) {
  const [value, setValue] = React.useState(initialValue);

  // Update local state if initialValue changes (e.g. from table reset)
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const isFirstRender = React.useRef(true);

  // Debounce the actual search trigger
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onSearch(value);
    }, 500);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative flex-1 w-full">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-lg pl-8"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pagination?: {
    pageIndex: number;
    pageSize: number;
  };
  onPaginationChange?: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  manualPagination?: boolean;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualSorting?: boolean;
  searchKey?: string;
  onSearch?: (value: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onSelectionChange?: (selectedRows: TData[]) => void;
  actionComponent?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  manualPagination = false,
  sorting: externalSorting,
  onSortingChange: onExternalSortingChange,
  manualSorting = false,
  searchKey,
  onSearch,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  onSelectionChange,
  actionComponent,
}: DataTableProps<TData, TValue>) {
  "use no memo"
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    [],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Trigger onSelectionChange when rowSelection updates
  React.useEffect(() => {
    if (onSelectionChange) {
      // rowSelection is a map of index/id to boolean
      // We need to map it back to the data
      const selectedIndices = Object.keys(rowSelection).filter(
        (key) => rowSelection[key as keyof typeof rowSelection],
      );
      const selectedData = selectedIndices
        .map((index) => data[parseInt(index)])
        .filter(Boolean);
      onSelectionChange(selectedData);
    }
  }, [rowSelection, data, onSelectionChange]);

  const actualSorting = externalSorting ?? internalSorting;

  const [internalPagination, setInternalPagination] = React.useState({
    pageIndex: pagination?.pageIndex ?? 0,
    pageSize: pagination?.pageSize ?? 10,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updater: Updater<SortingState>) => {
      const nextSorting =
        typeof updater === "function" ? updater(actualSorting) : updater;
      if (onExternalSortingChange) {
        onExternalSortingChange(nextSorting);
      } else {
        setInternalSorting(nextSorting);
      }
    },
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    pageCount: pageCount,
    manualPagination: manualPagination,
    manualSorting: manualSorting,
    state: {
      sorting: actualSorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: manualPagination
        ? (pagination ?? internalPagination)
        : internalPagination,
    },
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const nextPagination =
        typeof updater === "function"
          ? updater(
            manualPagination
              ? (pagination ?? internalPagination)
              : internalPagination,
          )
          : updater;

      if (manualPagination && onPaginationChange) {
        onPaginationChange(nextPagination);
      } else {
        setInternalPagination(nextPagination);
      }
    },
  });

  const handleSearchWrapper = React.useCallback(
    (value: string) => {
      if (searchKey) {
        const col = table.getColumn(searchKey);
        if (col) col.setFilterValue(value);
      }
      if (onSearch) onSearch(value);
    },
    [table, searchKey, onSearch],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {searchKey && (
          <div className="max-w-sm w-full">
            <SearchInput
              placeholder={`Search ${searchKey.replace(/_/g, " ")}...`}
              initialValue={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              }
              isLoading={isLoading}
              onSearch={handleSearchWrapper}
            />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {actionComponent}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize rounded-lg"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {(column.columnDef.meta as { label?: string })?.label ||
                        column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id} className="bg-muted/10">
                {headerGroup.headers.map((header: Header<TData, unknown>) => {
                  return (
                    <TableHead key={header.id} className="font-bold py-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && !data?.length ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-transparent">
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="py-3 ">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-4 bg-muted animate-pulse rounded ${colIndex === 0
                            ? "w-48"
                            : colIndex === columns.length - 1
                              ? "w-8 ml-auto"
                              : "w-24"
                            }`}
                        />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group hover:bg-muted/10 transition-colors"
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center border-none hover:bg-transparent"
                >
                  <EmptyPlaceholder
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground font-medium">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-bold">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px] rounded-lg">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-bold">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex rounded-lg"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex rounded-lg"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
