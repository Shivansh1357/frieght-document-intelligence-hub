"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Loader2, FileSearch, ClipboardCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; className: string; pulse?: boolean; Icon: LucideIcon }
> = {
  uploaded: {
    label: "Uploaded",
    className:
      "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    Icon: Upload,
  },
  processing: {
    label: "Processing",
    className:
      "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700",
    pulse: true,
    Icon: Loader2,
  },
  extracted: {
    label: "Extracted",
    className:
      "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-700",
    Icon: FileSearch,
  },
  reviewed: {
    label: "Reviewed",
    className:
      "bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-700",
    Icon: ClipboardCheck,
  },
  approved: {
    label: "Approved",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700",
    Icon: ShieldCheck,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700 border-gray-300",
    Icon: CheckCircle,
  };

  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", config.className)}>
      {config.pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      ) : (
        <config.Icon className="h-3 w-3" />
      )}
      {config.label}
    </Badge>
  );
}
