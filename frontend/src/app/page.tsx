"use client";

import { useState, useEffect } from "react";
import { useDocuments } from "@/hooks/use-documents";
import { DocumentTable } from "@/components/documents/document-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Upload, CheckCircle, BarChart3, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { stringifyCopilotContext } from "@/lib/copilot-context";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/layout/page-transition";

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query params
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (filterStatus) params.set("status", filterStatus);
  if (filterType) params.set("document_type", filterType);
  if (filterCountry) params.set("country_of_origin", filterCountry);
  if (filterDateFrom) params.set("date_from", filterDateFrom);
  if (filterDateTo) params.set("date_to", filterDateTo);

  const { data, isLoading } = useDocuments(params);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterType, filterCountry, filterDateFrom, filterDateTo]);

  // Compute stats from current data
  const items = data?.items ?? [];
  const extractedCount = items.filter(
    (d) => d.status === "extracted"
  ).length;
  const reviewedCount = items.filter(
    (d) => d.status === "reviewed" || d.status === "approved"
  ).length;
  const avgConfidence =
    items.length > 0
      ? items.reduce((sum, d) => sum + (d.overall_confidence ?? 0), 0) /
        items.filter((d) => d.overall_confidence != null).length
      : 0;

  const statsCards = [
    {
      title: "Total Documents",
      value: data?.total ?? 0,
      subtitle: `${data?.total ?? 0} uploaded`,
      icon: FileText,
      accent: "border-l-blue-500",
      iconColor: "text-blue-500",
      tooltip: "Total number of uploaded freight documents across all statuses",
    },
    {
      title: "Extracted",
      value: extractedCount,
      subtitle: "ready for review",
      icon: BarChart3,
      accent: "border-l-teal-500",
      iconColor: "text-teal-500",
      tooltip:
        "Documents with completed AI extraction, ready for human review",
    },
    {
      title: "Reviewed",
      value: reviewedCount,
      subtitle: "approved or reviewed",
      icon: CheckCircle,
      accent: "border-l-emerald-500",
      iconColor: "text-emerald-500",
      tooltip: "Documents that have been reviewed or approved by a user",
    },
    {
      title: "Avg Confidence",
      value: avgConfidence > 0 ? `${Math.round(avgConfidence)}%` : "--",
      subtitle: "extraction accuracy",
      icon: BarChart3,
      accent: "border-l-violet-500",
      iconColor: "text-violet-500",
      tooltip:
        "Average AI confidence score across extracted documents. Higher means more accurate extraction.",
    },
  ];

  return (
    <PageTransition>
    <div
      className="space-y-6"
      data-tour="dashboard-page"
      data-copilot-context={stringifyCopilotContext({
        page: "dashboard",
        filters: {
          search: debouncedSearch,
          status: filterStatus,
          document_type: filterType,
          country_of_origin: filterCountry,
          date_from: filterDateFrom,
          date_to: filterDateTo,
          page_size: pageSize,
          page,
        },
        stats: {
          total: data?.total ?? 0,
          extracted_on_page: extractedCount,
          reviewed_on_page: reviewedCount,
          avg_confidence_on_page: avgConfidence > 0 ? Math.round(avgConfidence) : null,
        },
        visible_documents: items.map((d) => ({
          id: d.id,
          file_name: d.file_name,
          invoice_number: d.invoice_number,
          shipper_name: d.shipper_name,
          consignee_name: d.consignee_name,
          status: d.status,
          overall_confidence: d.overall_confidence,
          country_of_origin: d.country_of_origin,
          total_declared_value: d.total_declared_value,
          currency: d.currency,
          uploaded_at: d.uploaded_at,
          document_type: d.document_type,
        })),
      })}
    >
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const apiBase =
                      process.env.NEXT_PUBLIC_API_URL ||
                      "http://localhost:8000/api/v1";
                    const orgId =
                      process.env.NEXT_PUBLIC_ORG_ID ||
                      "00000000-0000-0000-0000-000000000001";
                    const res = await fetch(`${apiBase}/export/documents/csv`, {
                      headers: { "X-Org-Id": orgId },
                    });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "freight_documents_export.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("CSV exported successfully");
                  } catch {
                    toast.error("Failed to export CSV");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Download all documents as CSV spreadsheet
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Link href="/upload">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              Upload a new freight document for AI extraction
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <StaggerContainer className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <StaggerItem key={stat.title}>
            <Tooltip>
              <TooltipTrigger render={<div className="min-w-0" />}>
                <Card className={`cursor-default h-full border-l-4 ${stat.accent}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate pr-2">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-5 w-5 shrink-0 ${stat.iconColor}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black tracking-tight">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stat.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {stat.tooltip}
              </TooltipContent>
            </Tooltip>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <DocumentTable
        data={items}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.page_size ?? 20}
        totalPages={data?.total_pages ?? 1}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={setSearch}
        onFilterStatus={setFilterStatus}
        onFilterType={setFilterType}
        onFilterCountry={setFilterCountry}
        onFilterDateFrom={setFilterDateFrom}
        onFilterDateTo={setFilterDateTo}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        filterStatus={filterStatus}
        filterType={filterType}
        filterCountry={filterCountry}
        filterDateFrom={filterDateFrom}
        filterDateTo={filterDateTo}
      />
    </div>
    </PageTransition>
  );
}
