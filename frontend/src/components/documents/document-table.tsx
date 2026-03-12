"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parse, parseISO } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Upload, FileText, Download, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { columns } from "./document-columns";
import type { DocumentSummary } from "@/lib/types";

interface DocumentTableProps {
  data: DocumentSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onFilterStatus: (status: string | null) => void;
  onFilterType: (type: string | null) => void;
  onFilterCountry: (country: string | null) => void;
  onFilterDateFrom: (date: string | null) => void;
  onFilterDateTo: (date: string | null) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  filterStatus: string | null;
  filterType: string | null;
  filterCountry: string | null;
  filterDateFrom: string | null;
  filterDateTo: string | null;
}

export function DocumentTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  onPageChange,
  onSearch,
  onFilterStatus,
  onFilterType,
  onFilterCountry,
  onFilterDateFrom,
  onFilterDateTo,
  onPageSizeChange,
  search,
  filterStatus,
  filterType,
  filterCountry,
  filterDateFrom,
  filterDateTo,
}: DocumentTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
  });

  // Derive unique countries from loaded data for filter
  const uniqueCountries = Array.from(
    new Set(data.map((d) => d.country_of_origin).filter(Boolean) as string[])
  ).sort();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBulkExport = async () => {
    try {
      const selectedDocs = selectedRows.map((r) => r.original);
      // Build CSV from selected rows
      const headers = [
        "File Name",
        "Invoice #",
        "Shipper",
        "Consignee",
        "Status",
        "Confidence",
        "Country",
        "Value",
        "Currency",
        "Uploaded",
      ];
      const csvRows = selectedDocs.map((d) => [
        d.file_name,
        d.invoice_number || "",
        d.shipper_name || "",
        d.consignee_name || "",
        d.status,
        d.overall_confidence != null ? `${d.overall_confidence}%` : "",
        d.country_of_origin || "",
        d.total_declared_value != null ? String(d.total_declared_value) : "",
        d.currency || "",
        d.uploaded_at,
      ]);
      const csv = [headers, ...csvRows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selected_documents_export_${selectedCount}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedCount} document(s)`);
      setRowSelection({});
    } catch {
      toast.error("Export failed");
    }
  };

  const fromDate = filterDateFrom ? parseISO(filterDateFrom) : undefined;
  const toDate = filterDateTo ? parseISO(filterDateTo) : undefined;

  return (
        <div className="space-y-4">
          {/* Filters + Bulk Actions */}
          <div className="flex flex-col gap-3" data-tour="dashboard-filters">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search shipper, consignee, commodity, reference..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
                  className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {selectedCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                <Download className="mr-2 h-4 w-4" />
                Export {selectedCount} selected
              </Button>
            )}
            <Select
              value={filterType || "all"}
              onValueChange={(v) => onFilterType(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[180px] shrink-0">
                <span className="flex flex-1 text-left">
                  {filterType === "commercial_invoice"
                    ? "Invoice"
                    : filterType === "packing_list"
                      ? "Packing List"
                      : filterType === "bill_of_lading"
                        ? "Bill of Lading"
                        : filterType === "combined"
                          ? "Combined"
                          : "All Doc Types"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doc Types</SelectItem>
                <SelectItem value="commercial_invoice">Invoice</SelectItem>
                <SelectItem value="packing_list">Packing List</SelectItem>
                <SelectItem value="bill_of_lading">Bill of Lading</SelectItem>
                <SelectItem value="combined">Combined</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterStatus || "all"}
              onValueChange={(v) => onFilterStatus(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[160px] shrink-0">
                <span className="flex flex-1 text-left">
                  {filterStatus === "uploaded"
                    ? "Uploaded"
                    : filterStatus === "processing"
                      ? "Processing"
                      : filterStatus === "extracted"
                        ? "Extracted"
                        : filterStatus === "reviewed"
                          ? "Reviewed"
                          : filterStatus === "approved"
                            ? "Approved"
                            : "All Statuses"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="extracted">Extracted</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Date range + Country filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
            <DatePicker
              value={isValid(fromDate) ? fromDate : undefined}
              onChange={(d) => onFilterDateFrom(d ? format(d, "yyyy-MM-dd") : null)}
              placeholder="dd/mm/yyyy"
              widthClassName="w-[170px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
            <DatePicker
              value={isValid(toDate) ? toDate : undefined}
              onChange={(d) => onFilterDateTo(d ? format(d, "yyyy-MM-dd") : null)}
              placeholder="dd/mm/yyyy"
              widthClassName="w-[170px]"
            />
          </div>
          <Select
            value={filterCountry || "all"}
            onValueChange={(v) => onFilterCountry(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[240px] shrink-0">
              <span className="flex flex-1 text-left">
                {filterCountry ? filterCountry : "All Countries"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueCountries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterDateFrom || filterDateTo || filterCountry) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                onFilterDateFrom(null);
                onFilterDateTo(null);
                onFilterCountry(null);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
          </div>

      {/* Selection info */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-2 text-sm">
          <span className="font-medium">{selectedCount}</span> document(s) selected
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setRowSelection({})}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border">
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <>
      <div className="rounded-lg border overflow-x-auto" data-tour="dashboard-table">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer transition-colors hover:bg-muted/60 data-[state=selected]:bg-primary/5"
                  onClick={(e) => {
                    // Don't navigate if clicking on checkbox, link, or button
                    const target = e.target as HTMLElement;
                    if (target.closest('a, button, input, [role="checkbox"]')) return;
                    router.push(`/documents/${row.original.id}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-normal align-top p-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <p className="text-lg font-medium">No documents found</p>
                      <p className="text-sm text-muted-foreground">
                        Upload your first freight document to get started.
                      </p>
                    </div>
                    <Link href="/upload">
                      <Button size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`
              : "No results"}
          </p>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">Rows</label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <span className="flex flex-1 text-left">{pageSize}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
        </>
      )}
        </div>
  );
}

function DatePicker({
  value,
  onChange,
  placeholder,
  widthClassName,
}: {
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
  widthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const lastCommittedIso = useMemo(
    () => (value && isValid(value) ? format(value, "yyyy-MM-dd") : ""),
    [value]
  );
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (isEditingRef.current) return;
    setText(value && isValid(value) ? format(value, "dd/MM/yyyy") : "");
  }, [lastCommittedIso, value]);

  const parseTyped = (raw: string): Date | undefined => {
    const v = raw.trim();
    if (!v) return undefined;

    // Prefer the UI format users see/enter.
    const d1 = parse(v, "dd/MM/yyyy", new Date());
    if (isValid(d1) && format(d1, "dd/MM/yyyy") === v) return d1;

    // Also accept ISO (useful for copy/paste).
    const d2 = parseISO(v);
    if (isValid(d2) && format(d2, "yyyy-MM-dd") === v) return d2;

    return undefined;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={<div className={`relative ${widthClassName || "w-[150px]"} shrink-0`} />}
      >
        <Input
          value={text}
          placeholder={placeholder || "dd/mm/yyyy"}
          className="h-10 pr-9 text-sm"
          inputMode="numeric"
          onFocus={() => {
            isEditingRef.current = true;
            setOpen(true);
          }}
          onBlur={() => {
            // If user leaves an invalid value, snap back to last committed.
            isEditingRef.current = false;
            const parsed = parseTyped(text);
            if (!text.trim()) {
              onChange(undefined);
              setText("");
              return;
            }
            if (parsed) {
              onChange(parsed);
              setText(format(parsed, "dd/MM/yyyy"));
              return;
            }
            setText(value && isValid(value) ? format(value, "dd/MM/yyyy") : "");
          }}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);

            const parsed = parseTyped(next);
            if (!next.trim()) {
              onChange(undefined);
              return;
            }
            if (parsed) onChange(parsed);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const parsed = parseTyped(text);
              if (parsed) {
                onChange(parsed);
                setText(format(parsed, "dd/MM/yyyy"));
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }
            if (e.key === "Escape") {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Open calendar"
          onMouseDown={(e) => {
            // Prevent input from losing focus before we toggle.
            e.preventDefault();
          }}
          onClick={() => setOpen((v) => !v)}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d ?? undefined);
            isEditingRef.current = false;
            setText(d ? format(d, "dd/MM/yyyy") : "");
            setOpen(false);
          }}
          initialFocus
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              onChange(undefined);
              isEditingRef.current = false;
              setText("");
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              const now = new Date();
              onChange(now);
              isEditingRef.current = false;
              setText(format(now, "dd/MM/yyyy"));
              setOpen(false);
            }}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

