"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DocumentSummary,
  ComparisonResult,
  DocumentStatus,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stringifyCopilotContext } from "@/lib/copilot-context";
import { PageTransition } from "@/components/layout/page-transition";
import { ContentSwap } from "@/components/layout/content-swap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Info,
  Eye,
} from "lucide-react";

const COMPARABLE_STATUSES: DocumentStatus[] = [
  "extracted",
  "reviewed",
  "approved",
];

function toTitleCase(snakeCase: string): string {
  return snakeCase
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getMatchColor(percentage: number): string {
  if (percentage >= 80) return "text-green-600 dark:text-green-400";
  if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

const FIELD_DESCRIPTIONS: Record<string, string> = {
  shipper_name: "The company or individual sending the goods",
  shipper_address: "Physical address of the shipper",
  consignee_name: "The party receiving the goods",
  consignee_address: "Delivery address for the goods",
  vessel_name: "Name of the ship carrying the cargo",
  voyage_number: "Voyage or trip identifier for the vessel",
  port_of_lading: "Port where goods are loaded onto the vessel",
  port_of_discharge: "Port where goods are unloaded from the vessel",
  country_of_origin: "Country where the goods were manufactured or produced",
  country_of_destination: "Country where the goods are being shipped to",
  incoterms: "International trade terms defining buyer/seller obligations",
  payment_terms: "Payment conditions agreed between parties",
  total_declared_value: "Total monetary value of the shipment as declared",
  currency: "Currency used for declared values",
  total_gross_weight: "Total weight including packaging",
  total_net_weight: "Total weight excluding packaging",
  weight_unit: "Unit of measurement for weights (KG, LB, etc.)",
  total_packages: "Total number of packages in the shipment",
  package_type: "Type of packaging (cartons, pallets, etc.)",
  document_date: "Date the document was issued",
  invoice_number: "Unique identifier for the invoice",
  mbl_number: "Master Bill of Lading number",
  hbl_number: "House Bill of Lading number",
};

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return "[&_[data-slot=progress-indicator]]:bg-green-600";
  if (percentage >= 50) return "[&_[data-slot=progress-indicator]]:bg-yellow-500";
  return "[&_[data-slot=progress-indicator]]:bg-red-600";
}

export default function ComparePage() {
  const [doc1Id, setDoc1Id] = useState<string | null>(null);
  const [doc2Id, setDoc2Id] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<{
    id1: string;
    id2: string;
  } | null>(null);
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const orgId =
    process.env.NEXT_PUBLIC_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const fileUrlFor = (id: string) => `${apiBase}/documents/${id}/file?org_id=${orgId}`;

  const { data: docList, isLoading: isLoadingDocs } = useQuery({
    queryKey: ["documents", "compare-list"],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page_size", "100");
      return api.documents.list(params);
    },
  });

  const comparableDocs: DocumentSummary[] =
    docList?.items.filter((doc) =>
      COMPARABLE_STATUSES.includes(doc.status)
    ) ?? [];

  const {
    data: comparisonResult,
    isLoading: isComparing,
    error: comparisonError,
    isFetching: isComparisonFetching,
  } = useQuery<ComparisonResult>({
    queryKey: ["comparison", compareIds?.id1, compareIds?.id2],
    queryFn: () => api.comparison.compare(compareIds!.id1, compareIds!.id2),
    enabled: !!compareIds,
  });

  const canCompare =
    doc1Id && doc2Id && doc1Id !== doc2Id && !isComparisonFetching;

  const handleCompare = () => {
    if (doc1Id && doc2Id && doc1Id !== doc2Id) {
      setCompareIds({ id1: doc1Id, id2: doc2Id });
    }
  };

  const doc1 = comparableDocs.find((d) => d.id === doc1Id);
  const doc2 = comparableDocs.find((d) => d.id === doc2Id);

  return (
    <PageTransition>
    <div
      className="space-y-6"
      data-copilot-context={stringifyCopilotContext({
        page: "compare",
        compare: {
          doc1: doc1Id
            ? { id: doc1Id, name: doc1?.file_name || doc1Id }
            : undefined,
          doc2: doc2Id
            ? { id: doc2Id, name: doc2?.file_name || doc2Id }
            : undefined,
          matchPercentage: comparisonResult?.match_percentage ?? undefined,
          mismatchedFields: comparisonResult?.mismatched_fields ?? undefined,
          matchingFields: comparisonResult?.matching_fields ?? undefined,
          totalFields: comparisonResult?.total_fields ?? undefined,
        },
      })}
    >
      {/* Why Compare — context explanation */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex gap-3 py-4">
          <FileText className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p className="font-medium">When to use document comparison</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
              <li>Cross-check a commercial invoice against its packing list for weight/quantity mismatches</li>
              <li>Verify consistency between related shipments from the same supplier</li>
              <li>Identify data discrepancies before customs submission</li>
              <li>Compare re-extracted documents to check for extraction improvements</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Document Selectors */}
      <Card data-tour="compare-select">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Select Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : comparableDocs.length < 2 ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
              <p>
                At least two documents with extracted data are required for
                comparison. Upload and process more documents first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                {/* Document 1 selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document 1</label>
                  <Select value={doc1Id} onValueChange={(v) => setDoc1Id(v)}>
                    <SelectTrigger className="w-full">
                      <span className="flex flex-1 items-center gap-2 text-left">
                        <span className="line-clamp-1">
                          {doc1
                            ? doc1.file_name || doc1.invoice_number || doc1.id
                            : "Select first document..."}
                        </span>
                        {doc1?.invoice_number && (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {doc1.invoice_number}
                          </span>
                        )}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {comparableDocs.map((doc) => (
                        <SelectItem
                          key={doc.id}
                          value={doc.id}
                          disabled={doc.id === doc2Id}
                        >
                          {doc.file_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {doc1 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {toTitleCase(doc1.document_type)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {toTitleCase(doc1.status)}
                        </Badge>
                        <a
                          href={`/documents/${doc1.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                            View Details
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow icon */}
                <div className="hidden md:flex items-center justify-center pt-6">
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Document 2 selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document 2</label>
                  <Select value={doc2Id} onValueChange={(v) => setDoc2Id(v)}>
                    <SelectTrigger className="w-full">
                      <span className="flex flex-1 items-center gap-2 text-left">
                        <span className="line-clamp-1">
                          {doc2
                            ? doc2.file_name || doc2.invoice_number || doc2.id
                            : "Select second document..."}
                        </span>
                        {doc2?.invoice_number && (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {doc2.invoice_number}
                          </span>
                        )}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {comparableDocs.map((doc) => (
                        <SelectItem
                          key={doc.id}
                          value={doc.id}
                          disabled={doc.id === doc1Id}
                        >
                          {doc.file_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {doc2 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {toTitleCase(doc2.document_type)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {toTitleCase(doc2.status)}
                        </Badge>
                        <a
                          href={`/documents/${doc2.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                            View Details
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {doc1Id && doc2Id && doc1Id === doc2Id && doc1Id !== null && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Please select two different documents to compare.
                </p>
              )}

              <Button
                onClick={handleCompare}
                disabled={!canCompare}
                className="w-full sm:w-auto"
                data-tour="compare-action"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Compare Documents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ContentSwap
        swapKey={
          isComparing
            ? "loading"
            : comparisonError
              ? "error"
              : comparisonResult
                ? "results"
                : "idle"
        }
      >
        {isComparing ? (
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        ) : comparisonError ? (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Comparison Failed</p>
                <p className="text-sm text-muted-foreground">
                  {comparisonError instanceof Error
                    ? comparisonError.message
                    : "An unexpected error occurred while comparing documents."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : comparisonResult ? (
          <div className="space-y-6" data-tour="compare-results">
          <Separator />

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                {/* Match percentage */}
                <div className="text-center sm:text-left">
                  <p
                    className={`text-5xl font-bold tabular-nums ${getMatchColor(comparisonResult.match_percentage)}`}
                  >
                    {comparisonResult.match_percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Match Rate
                  </p>
                </div>

                {/* Progress bar and stats */}
                <div className="flex-1 w-full space-y-4">
                  <Progress
                    value={comparisonResult.match_percentage}
                    className={getProgressColor(
                      comparisonResult.match_percentage
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                        {comparisonResult.matching_fields}
                      </p>
                      <p className="text-xs text-muted-foreground">Matching</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                        {comparisonResult.mismatched_fields}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mismatched
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">
                        {comparisonResult.total_fields}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Fields
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Doc 1: {toTitleCase(comparisonResult.document_1_type)}
                    </Badge>
                    <Badge variant="outline">
                      Doc 2: {toTitleCase(comparisonResult.document_2_type)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison views: Extracted Data vs Original Documents */}
          <Tabs defaultValue="extracted" className="space-y-4">
            <TabsList>
              <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
              <TabsTrigger value="originals">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Original Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="originals">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Side-by-Side Original Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Document 1: {doc1?.file_name}</p>
                      {doc1Id && <InlineDocPreview url={fileUrlFor(doc1Id)} fileName={doc1?.file_name || ""} height="60vh" />}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Document 2: {doc2?.file_name}</p>
                      {doc2Id && <InlineDocPreview url={fileUrlFor(doc2Id)} fileName={doc2?.file_name || ""} height="60vh" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extracted">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Field Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonResult.fields.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center">
                  No fields to compare.
                </p>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Document 1</TableHead>
                      <TableHead>Document 2</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonResult.fields.map((field) => {
                      const desc = FIELD_DESCRIPTIONS[field.field_name];
                      return (
                        <TableRow
                          key={field.field_name}
                          className={
                            !field.match
                              ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                              : ""
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {toTitleCase(field.field_name)}
                              {desc && (
                                <Tooltip>
                                  <TooltipTrigger render={<span className="inline-flex" />}>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    {desc}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[420px] align-top font-mono text-sm whitespace-pre-wrap break-words">
                            {field.document_1_value ? (
                              <Tooltip>
                                <TooltipTrigger render={<span className="inline-block" />}>
                                  {field.document_1_value}
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md whitespace-pre-wrap break-words">
                                  {field.document_1_value}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground italic">empty</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[420px] align-top font-mono text-sm whitespace-pre-wrap break-words">
                            {field.document_2_value ? (
                              <Tooltip>
                                <TooltipTrigger render={<span className="inline-block" />}>
                                  {field.document_2_value}
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md whitespace-pre-wrap break-words">
                                  {field.document_2_value}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground italic">empty</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {field.match ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                                Match
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                                Mismatch
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Mismatch summary */}
                {comparisonResult.fields.filter((f) => !f.match).length > 0 && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {comparisonResult.mismatched_fields} field(s) differ between these documents
                        </p>
                      <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                          {comparisonResult.fields
                            .filter((f) => !f.match)
                            .slice(0, 5)
                            .map((f) => (
                              <li key={f.field_name} className="break-words whitespace-pre-wrap">
                                <strong>{toTitleCase(f.field_name)}:</strong>{" "}
                                &quot;{f.document_1_value || "empty"}&quot; vs{" "}
                                &quot;{f.document_2_value || "empty"}&quot;
                              </li>
                            ))}
                          {comparisonResult.fields.filter((f) => !f.match).length > 5 && (
                            <li className="text-amber-600 dark:text-amber-400 italic">
                              ...and {comparisonResult.fields.filter((f) => !f.match).length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                </>
              )}
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>
        </div>
        ) : null}
      </ContentSwap>
    </div>
    </PageTransition>
  );
}

function InlineDocPreview({
  url,
  fileName,
  height = "40vh",
}: {
  url: string;
  fileName: string;
  height?: string;
}) {
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return (
      <iframe
        src={url}
        className="w-full rounded-lg border"
        style={{ height }}
        title={`Preview of ${fileName}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={fileName}
      className="w-full rounded-lg border object-contain"
      style={{ maxHeight: height }}
    />
  );
}
