"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/components/upload/dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { Upload as UploadIcon, Eye, Plus, AlertTriangle, CheckCircle, Loader2, X, FileText, FileUp, ScanSearch, Brain, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { PageTransition } from "@/components/layout/page-transition";
import { stringifyCopilotContext } from "@/lib/copilot-context";
import { cn } from "@/lib/utils";

interface DuplicateMatch {
  id: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  invoice_number?: string | null;
}

type QueueStatus =
  | "pending"
  | "checking"
  | "duplicate"
  | "ready"
  | "uploading"
  | "done"
  | "skipped"
  | "error";

type QueueItem = {
  localId: string;
  file: File;
  hash?: string;
  status: QueueStatus;
  progress: number;
  duplicateMatches: DuplicateMatch[];
  uploadAnyway: boolean;
  uploadedDocumentId?: string;
  error?: string;
};

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function UploadPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const queueStats = useMemo(() => {
    const total = queue.length;
    const done = queue.filter((q) => q.status === "done").length;
    const uploading = queue.filter((q) => q.status === "uploading").length;
    const duplicates = queue.filter((q) => q.status === "duplicate").length;
    const errors = queue.filter((q) => q.status === "error").length;
    return { total, done, uploading, duplicates, errors };
  }, [queue]);

  const clearIntervalFor = (localId: string) => {
    const ref = intervalRefs.current[localId];
    if (ref) {
      clearInterval(ref);
      delete intervalRefs.current[localId];
    }
  };

  useEffect(() => {
    return () => {
      Object.keys(intervalRefs.current).forEach((id) => clearIntervalFor(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertQueueItems = useCallback((files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      status: "pending",
      progress: 0,
      duplicateMatches: [],
      uploadAnyway: false,
    }));
    setQueue((prev) => [...newItems, ...prev]);
  }, []);

  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const uniqueByKey = new Map<string, File>();
      for (const f of files) {
        uniqueByKey.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      }
      upsertQueueItems(Array.from(uniqueByKey.values()));
    },
    [upsertQueueItems]
  );

  const runDuplicateChecks = useCallback(async () => {
    setQueue((prev) =>
      prev.map((q) =>
        q.status === "pending" ? { ...q, status: "checking" } : q
      )
    );

    for (const item of queue) {
      if (item.status !== "pending") continue;
      try {
        const hash = await computeFileHash(item.file);
        const result = await api.documents.checkDuplicate(hash);
        const response = result as {
          is_duplicate: boolean;
          matching_documents: DuplicateMatch[];
        };
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? {
                  ...q,
                  hash,
                  duplicateMatches: response.matching_documents || [],
                  status:
                    response.is_duplicate && (response.matching_documents?.length || 0) > 0
                      ? "duplicate"
                      : "ready",
                }
              : q
          )
        );
      } catch (e) {
        // If check fails, proceed without blocking
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId ? { ...q, status: "ready" } : q
          )
        );
      }
    }
  }, [queue]);

  useEffect(() => {
    if (queue.some((q) => q.status === "pending")) {
      runDuplicateChecks();
    }
  }, [queue, runDuplicateChecks]);

  const removeItem = (localId: string) => {
    clearIntervalFor(localId);
    setQueue((prev) => prev.filter((q) => q.localId !== localId));
  };

  const toggleUploadAnyway = (localId: string, next: boolean) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.localId === localId
          ? {
              ...q,
              uploadAnyway: next,
              status: next ? "ready" : "duplicate",
            }
          : q
      )
    );
  };

  const uploadOne = async (item: QueueItem) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.localId === item.localId
          ? { ...q, status: "uploading", progress: 0, error: undefined }
          : q
      )
    );

    let currentProgress = 0;
    intervalRefs.current[item.localId] = setInterval(() => {
      currentProgress += Math.random() * 8 + 2;
      if (currentProgress > 90) currentProgress = 90;
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? { ...q, progress: Math.round(currentProgress) }
            : q
        )
      );
    }, 450);

    try {
      const formData = new FormData();
      formData.append("file", item.file);
      const result = (await api.documents.upload(formData)) as any;
      clearIntervalFor(item.localId);
      // Show extraction warning toast if the API reported a specific failure reason
      if (result?.extraction_warning) {
        const isCredits =
          result.extraction_warning.toLowerCase().includes("credit") ||
          result.extraction_warning.toLowerCase().includes("usage limit");
        toast.warning(result.extraction_warning, {
          duration: 12000,
          action: isCredits
            ? {
                label: "Add Credits",
                onClick: () => window.open("https://console.anthropic.com/settings/billing", "_blank"),
              }
            : undefined,
        });
      }
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? {
                ...q,
                status: "done",
                progress: 100,
                uploadedDocumentId: result?.id,
              }
            : q
        )
      );
    } catch (e) {
      clearIntervalFor(item.localId);
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? {
                ...q,
                status: "error",
                progress: 0,
                error: e instanceof Error ? e.message : "Upload failed",
              }
            : q
        )
      );
    }
  };

  const uploadAll = async () => {
    if (isUploadingAll) return;
    setIsUploadingAll(true);
    try {
      for (const item of queue) {
        if (item.status === "ready") {
          await uploadOne(item);
        }
        if (item.status === "duplicate") {
          // user didn't approve uploading duplicates
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId ? { ...q, status: "skipped" } : q
            )
          );
        }
      }
    } finally {
      setIsUploadingAll(false);
    }
  };

  const clearQueue = () => {
    Object.keys(intervalRefs.current).forEach((id) => clearIntervalFor(id));
    setQueue([]);
  };

  return (
    <PageTransition>
    <div
      className="mx-auto max-w-3xl space-y-8"
      data-copilot-context={stringifyCopilotContext({
        page: "upload",
        upload_state: {
          bulk_mode: true,
          queue_total: queueStats.total,
          queue_done: queueStats.done,
          queue_uploading: queueStats.uploading,
          queue_duplicates: queueStats.duplicates,
          queue_errors: queueStats.errors,
        },
      })}
    >
      <Card>
        <CardHeader>
          <CardTitle>Select Document(s)</CardTitle>
          <CardDescription>
            Upload one or more documents (PDF or image). Files are processed sequentially to keep the UI responsive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" data-tour="upload-dropzone">
          <Dropzone
            multiple
            onFilesAccepted={handleFilesAccepted}
            disabled={isUploadingAll}
          />

          {/* Bulk queue */}
          {queue.length > 0 && (
            <div className="space-y-3" data-tour="upload-queue">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="text-sm text-muted-foreground">
                  {queueStats.done}/{queueStats.total} processed
                  {queueStats.duplicates > 0 ? ` • ${queueStats.duplicates} duplicates` : ""}
                  {queueStats.errors > 0 ? ` • ${queueStats.errors} errors` : ""}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearQueue}
                    disabled={isUploadingAll}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={uploadAll}
                    data-tour="upload-uploadall"
                    disabled={
                      isUploadingAll ||
                      !queue.some((q) => q.status === "ready" || q.status === "duplicate")
                    }
                  >
                    {isUploadingAll ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        {queue.filter((q) => q.status === "ready" || q.status === "duplicate").length > 1
                          ? "Upload All"
                          : "Upload"}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {queue.map((item) => {
                  const isDuplicate = item.duplicateMatches.length > 0;
                  return (
                    <div
                      key={item.localId}
                      className={cn(
                        "rounded-lg border p-3",
                        item.status === "error" && "border-destructive/40 bg-destructive/5",
                        item.status === "done" && "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20",
                        item.status === "duplicate" && "border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            {isDuplicate && item.status !== "ready" ? " • Possible duplicate" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === "done" && (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          )}
                          {item.status === "error" && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          {item.status === "uploading" && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          <button
                            className="rounded-md p-1 hover:bg-muted"
                            onClick={() => removeItem(item.localId)}
                            disabled={isUploadingAll || item.status === "uploading"}
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Duplicate actions */}
                      {item.status === "duplicate" && item.duplicateMatches.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a
                            href={`/documents/${item.duplicateMatches[0].id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              View existing
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-amber-600 text-white hover:bg-amber-700"
                            onClick={() => toggleUploadAnyway(item.localId, true)}
                            disabled={isUploadingAll}
                          >
                            Upload anyway
                          </Button>
                        </div>
                      )}

                      {/* Pipeline stages */}
                      {item.status === "uploading" && (
                        <div className="mt-3 space-y-2">
                          <PipelineStages progress={item.progress} />
                          <Progress value={item.progress} className="h-1.5" />
                        </div>
                      )}
                      {item.status === "done" && item.uploadedDocumentId && (
                        <div className="mt-2 space-y-2">
                          <PipelineStages progress={100} />
                          <div className="flex items-center gap-2">
                            <a
                              href={`/documents/${item.uploadedDocumentId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                <Eye className="mr-1 h-3 w-3" />
                                View document
                              </Button>
                            </a>
                          </div>
                        </div>
                      )}
                      {item.status === "error" && item.error && (
                        <p className="mt-2 text-xs text-destructive">{item.error}</p>
                      )}
                      {item.status === "skipped" && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Skipped (duplicate not uploaded)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* After queue completes, offer quick navigation */}
              {queueStats.done > 0 && queueStats.done === queueStats.total && (
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <Button variant="outline" onClick={() => router.push("/")}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={clearQueue}>
                    Upload more
                    <Plus className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported document types — only show when queue is empty */}
      {queue.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              type: "Commercial Invoice",
              formats: "PDF, PNG, JPEG",
              description: "Shipper, consignee, values, line items",
            },
            {
              type: "Packing List",
              formats: "PDF, PNG, JPEG",
              description: "Weights, packages, HS codes, quantities",
            },
            {
              type: "Bill of Lading",
              formats: "PDF, PNG, JPEG",
              description: "Vessel, ports, container numbers, MBL/HBL",
            },
          ].map((doc) => (
            <div
              key={doc.type}
              className="flex items-start gap-3 rounded-lg border bg-card/50 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{doc.type}</p>
                <p className="text-xs text-muted-foreground">{doc.description}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{doc.formats}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}

const PIPELINE_STAGES = [
  { key: "upload", label: "Uploading", icon: FileUp, threshold: 0 },
  { key: "scan", label: "Scanning Document", icon: ScanSearch, threshold: 25 },
  { key: "extract", label: "AI Extracting", icon: Brain, threshold: 50 },
  { key: "store", label: "Storing Results", icon: BarChart3, threshold: 80 },
] as const;

function PipelineStages({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {PIPELINE_STAGES.map((stage, i) => {
        const isDone = i < PIPELINE_STAGES.length - 1
          ? progress >= PIPELINE_STAGES[i + 1].threshold
          : progress >= 100;
        const isActive = !isDone && progress >= stage.threshold && (i === PIPELINE_STAGES.length - 1 || progress < PIPELINE_STAGES[i + 1].threshold);
        const Icon = stage.icon;

        return (
          <div key={stage.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={cn(
                "h-px w-3",
                isDone || isActive ? "bg-primary" : "bg-muted-foreground/20"
              )} />
            )}
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors",
              isDone && "text-emerald-600 dark:text-emerald-400",
              isActive && "text-primary font-medium bg-primary/10",
              !isDone && !isActive && "text-muted-foreground/50"
            )}>
              {isActive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isDone ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{stage.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
