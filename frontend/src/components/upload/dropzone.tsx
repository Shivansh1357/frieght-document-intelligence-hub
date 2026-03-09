"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, FileText, X, Shield, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

interface DropzoneProps {
  onFileAccepted?: (file: File) => void;
  onFilesAccepted?: (files: File[]) => void;
  selectedFile?: File | null;
  onRemove?: () => void;
  multiple?: boolean;
  disabled?: boolean;
}

export function Dropzone({
  onFileAccepted,
  onFilesAccepted,
  selectedFile,
  onRemove,
  multiple = false,
  disabled,
}: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      if (multiple) {
        onFilesAccepted?.(acceptedFiles);
        return;
      }
      onFileAccepted?.(acceptedFiles[0]);
    },
    [multiple, onFileAccepted, onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple,
    disabled,
  });

  if (!multiple && selectedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                <span className="mx-2">-</span>
                Ready for extraction
              </p>
            </div>
          </div>
          {!disabled && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <button
                  onClick={onRemove}
                  className="rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Remove file</TooltipContent>
            </Tooltip>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { y: -5 } : { y: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
        </motion.div>
        <p className="mt-4 text-lg font-semibold">
          {isDragActive
            ? multiple
              ? "Drop your documents here"
              : "Drop your document here"
            : multiple
              ? "Drag & drop your documents"
              : "Drag & drop your document"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {multiple ? "or click to browse (multi-select supported)" : "or click to browse your files"}
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            PDF, PNG, JPEG
          </span>
          <span className="h-3 w-px bg-border" />
          <span>Max 20MB</span>
        </div>
      </div>

      {/* Feature hints */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Zap,
            title: "AI-Powered",
            desc: "30+ fields extracted automatically",
            color: "text-amber-500 bg-amber-50 dark:bg-amber-950/50",
          },
          {
            icon: Shield,
            title: "Confidence Scores",
            desc: "Per-field accuracy indicators",
            color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50",
          },
          {
            icon: Clock,
            title: "Fast Processing",
            desc: "Results in under 30 seconds",
            color: "text-blue-500 bg-blue-50 dark:bg-blue-950/50",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.color}`}>
              <feature.icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold">{feature.title}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
