"use client";

import { use, useState } from "react";
import { useDocument } from "@/hooks/use-documents";
import { useQueryClient } from "@tanstack/react-query";
import { ExtractionForm } from "@/components/extraction/extraction-form";
import { LineItemsTable } from "@/components/extraction/line-items-table";
import { CorrectionTimeline } from "@/components/corrections/correction-timeline";
import { StatusBadge } from "@/components/documents/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Calendar,
  Weight,
  DollarSign,
  Download,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/api";
import Link from "next/link";
import { stringifyCopilotContext } from "@/lib/copilot-context";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/layout/page-transition";

const DOC_TYPE_LABELS: Record<string, string> = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  bill_of_lading: "Bill of Lading",
  combined: "Combined Document",
};

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: doc, isLoading, error } = useDocument(id);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reextractOpen, setReextractOpen] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["document", id] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["document-corrections", id] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const handleApprove = async () => {
    try {
      await api.documents.update(id, { status: "approved" });
      invalidateAll();
      toast.success("Document approved.");
    } catch {
      toast.error("Failed to approve document.");
    }
  };

  const handleReextract = async () => {
    try {
      toast.info("Re-extracting document...");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/documents/${id}/reextract`,
        {
          method: "POST",
          headers: { "X-Org-Id": "00000000-0000-0000-0000-000000000001" },
        }
      );
      if (res.ok) {
        toast.success("Extraction completed!");
        handleRefresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || "Re-extraction failed.");
      }
    } catch {
      toast.error("Re-extraction request failed.");
    }
  };

  const handleRefresh = () => {
    invalidateAll();
  };

  if (isLoading) return <DetailSkeleton />;
  if (error || !doc) return <div className="p-6">Document not found.</div>;

  const extracted = doc.extracted_data;

  return (
    <PageTransition>
    <div
      className="space-y-6"
      data-copilot-context={stringifyCopilotContext({
        page: "document-detail",
        document: {
          id: doc.id,
          file_name: doc.file_name,
          document_type: doc.document_type,
          status: doc.status,
          uploaded_at: doc.uploaded_at,
          file_mime_type: doc.file_mime_type,
        },
        extracted_summary: extracted
          ? {
              invoice_number: extracted.invoice_number,
              document_date: extracted.document_date,
              shipper_name: extracted.shipper_name,
              consignee_name: extracted.consignee_name,
              total_declared_value: extracted.total_declared_value,
              currency: extracted.currency,
              total_gross_weight: extracted.total_gross_weight,
              weight_unit: extracted.weight_unit,
              line_item_count: extracted.line_items?.length ?? 0,
              extraction_fields_count: extracted.extraction_fields?.length ?? 0,
            }
          : null,
        corrections_count: doc.corrections?.length ?? 0,
      })}
    >
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve this document?"
        description="Approving marks this document as finalized. Make sure you’ve reviewed and corrected any fields before approving."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={handleApprove}
      />

      <ConfirmDialog
        open={reextractOpen}
        onOpenChange={setReextractOpen}
        title="Re-extract this document?"
        description="This will run AI extraction again and may change extracted values. Use this if the current extraction is missing or incorrect."
        confirmLabel="Re-extract"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleReextract}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Link href="/">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Back to Dashboard</TooltipContent>
            </Tooltip>
            <h2 className="text-2xl font-bold tracking-tight">
              {doc.file_name}
            </h2>
          </div>
          <div className="flex items-center gap-3 pl-10">
            <StatusBadge status={doc.status} />
            <Badge variant="outline">
              {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Uploaded {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {extracted && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const apiBase =
                        process.env.NEXT_PUBLIC_API_URL ||
                        "http://localhost:8000/api/v1";
                      const orgId =
                        process.env.NEXT_PUBLIC_ORG_ID ||
                        "00000000-0000-0000-0000-000000000001";
                      const res = await fetch(
                        `${apiBase}/export/documents/${id}/csv`,
                        { headers: { "X-Org-Id": orgId } }
                      );
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${doc.file_name.replace(/\.[^.]+$/, "")}_export.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("CSV exported");
                    } catch {
                      toast.error("Export failed");
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export line items as CSV</TooltipContent>
            </Tooltip>
          )}
          {doc.status !== "approved" && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApproveOpen(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Mark this document as approved and finalize extraction
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {extracted && (
        <StaggerContainer className="grid gap-4 md:grid-cols-4">
          <StaggerItem><Card className="border-l-4 border-l-blue-500">
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice #</p>
                <p className="font-mono font-semibold">
                  {extracted.invoice_number || "--"}
                </p>
              </div>
            </CardContent>
          </Card>
          </StaggerItem>
          <StaggerItem><Card className="border-l-4 border-l-teal-500">
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/50">
                <Calendar className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Document Date</p>
                <p className="font-semibold">
                  {extracted.document_date || "--"}
                </p>
              </div>
            </CardContent>
          </Card>
          </StaggerItem>
          <StaggerItem><Card className="border-l-4 border-l-emerald-500">
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Declared Value</p>
                <p className="font-mono font-semibold">
                  {extracted.total_declared_value
                    ? `${extracted.currency} ${Number(extracted.total_declared_value).toLocaleString()}`
                    : "--"}
                </p>
              </div>
            </CardContent>
          </Card>
          </StaggerItem>
          <StaggerItem><Card className="border-l-4 border-l-violet-500">
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/50">
                <Weight className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross Weight</p>
                <p className="font-mono font-semibold">
                  {extracted.total_gross_weight
                    ? `${Number(extracted.total_gross_weight).toLocaleString()} ${extracted.weight_unit}`
                    : "--"}
                </p>
              </div>
            </CardContent>
          </Card></StaggerItem>
        </StaggerContainer>
      )}

      {/* Tabs */}
      {extracted ? (
        <Tabs defaultValue="extracted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
            <TabsTrigger value="line-items">
              Line Items{" "}
              {extracted.line_items?.length
                ? `(${extracted.line_items.length})`
                : ""}
            </TabsTrigger>
            <TabsTrigger value="corrections">
              Corrections{" "}
              {doc.corrections?.length ? `(${doc.corrections.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="original">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Original Document
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extracted">
            <ExtractionForm
              documentId={id}
              extractedData={extracted}
              extractionFields={extracted.extraction_fields || []}
              onSaved={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="line-items">
            <LineItemsTable
              items={extracted.line_items || []}
              documentId={id}
              onSaved={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="corrections">
            <CorrectionTimeline corrections={doc.corrections || []} />
          </TabsContent>

          <TabsContent value="original">
            <Card>
              <CardContent className="pt-6">
                <DocumentPreview
                  documentId={id}
                  mimeType={doc.file_mime_type}
                  fileName={doc.file_name}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            {doc.status === "processing" ? (
              <p className="text-muted-foreground">
                AI extraction is in progress...
              </p>
            ) : (
              <>
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="font-medium">No extraction data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {doc.status === "uploaded"
                      ? "Extraction may have failed or the document hasn't been processed yet."
                      : "The document may need to be re-processed."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setReextractOpen(true)}
                >
                  Re-extract Document
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </PageTransition>
  );
}

function DocumentPreview({
  documentId,
  mimeType,
  fileName,
}: {
  documentId: string;
  mimeType: string;
  fileName: string;
}) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const orgId =
    process.env.NEXT_PUBLIC_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const previewUrl = `${apiBase}/documents/${documentId}/file?org_id=${orgId}`;
  const downloadUrl = `${previewUrl}&download=1`;

  if (mimeType === "application/pdf") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Viewing: {fileName}
          </p>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </a>
        </div>
        <iframe
          src={previewUrl}
          className="w-full rounded-lg border"
          style={{ height: "80vh" }}
          title={`Preview of ${fileName}`}
        />
      </div>
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Viewing: {fileName}
          </p>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={fileName}
          className="w-full rounded-lg border object-contain"
          style={{ maxHeight: "80vh" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <FileText className="h-16 w-16 text-muted-foreground/40" />
      <div className="text-center">
        <p className="font-medium">Preview not available</p>
        <p className="text-sm text-muted-foreground mt-1">
          File type ({mimeType}) cannot be previewed in the browser.
        </p>
      </div>
      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Original
        </Button>
      </a>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-96" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
