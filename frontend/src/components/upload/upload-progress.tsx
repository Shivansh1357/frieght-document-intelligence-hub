"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Upload,
  FileSearch,
  Brain,
  Database,
} from "lucide-react";

interface UploadProgressProps {
  progress: number;
  isUploading: boolean;
  error: string | null;
  status?: string;
}

const STAGES = [
  {
    label: "Uploading Document",
    description: "Transferring file to server...",
    icon: Upload,
    threshold: 0,
  },
  {
    label: "Processing PDF",
    description: "Converting pages to high-resolution images (200 DPI)...",
    icon: FileSearch,
    threshold: 25,
  },
  {
    label: "AI Extraction",
    description: "Claude AI is analyzing the document and extracting fields...",
    icon: Brain,
    threshold: 50,
  },
  {
    label: "Saving Results",
    description: "Storing extracted data in the database...",
    icon: Database,
    threshold: 85,
  },
];

function getActiveStageIndex(progress: number): number {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (progress >= STAGES[i].threshold) return i;
  }
  return 0;
}

export function UploadProgress({
  progress,
  isUploading,
  error,
  status,
}: UploadProgressProps) {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">Upload Failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Please check the file format and try again.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!isUploading && progress === 100) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-5 dark:bg-emerald-950/30"
      >
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900"
          >
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </motion.div>
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Extraction Complete
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "extracted"
                ? "All fields extracted successfully. Redirecting to document detail..."
                : status === "uploaded"
                  ? "Document uploaded. Extraction may still be processing."
                  : "Redirecting to document detail..."}
            </p>
            {/* Completed stages */}
            <div className="mt-3 flex gap-3">
              {STAGES.map((stage, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isUploading) {
    const activeIndex = getActiveStageIndex(progress);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 rounded-xl border bg-card p-5"
      >
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <p className="font-semibold">Processing Document</p>
          <span className="text-sm font-mono text-muted-foreground">
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-2" />

        {/* Stage indicators */}
        <div className="space-y-2">
          {STAGES.map((stage, i) => {
            const StageIcon = stage.icon;
            const isActive = i === activeIndex;
            const isComplete = i < activeIndex;
            const isPending = i > activeIndex;

            return (
              <motion.div
                key={i}
                initial={isActive ? { opacity: 0, x: -5 } : {}}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? "bg-primary/5 border border-primary/20"
                    : isComplete
                      ? "opacity-60"
                      : "opacity-30"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isComplete
                      ? "bg-emerald-100 dark:bg-emerald-900"
                      : isActive
                        ? "bg-primary/10"
                        : "bg-muted"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <StageIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isPending ? "text-muted-foreground" : ""
                    }`}
                  >
                    {stage.label}
                  </p>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground"
                    >
                      {stage.description}
                    </motion.p>
                  )}
                </div>
                {isComplete && (
                  <span className="text-xs text-emerald-600">Done</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Analyzing animation hint */}
        {activeIndex >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <Brain className="h-3.5 w-3.5" />
            AI extraction in progress — time varies by document complexity
          </motion.div>
        )}
      </motion.div>
    );
  }

  return null;
}
