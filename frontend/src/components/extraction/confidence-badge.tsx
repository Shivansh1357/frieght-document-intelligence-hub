"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ConfidenceBadge({
  confidence,
  showLabel = false,
}: {
  confidence: number;
  showLabel?: boolean;
}) {
  const getColor = (c: number) => {
    if (c >= 90)
      return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950";
    if (c >= 70)
      return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950";
    return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
  };

  const getLabel = (c: number) => {
    if (c >= 90) return "High";
    if (c >= 70) return "Medium";
    return "Low";
  };

  const getTooltip = (c: number) => {
    if (c >= 90)
      return "High confidence — AI is very confident in this extraction. Likely accurate.";
    if (c >= 70)
      return "Medium confidence — AI is moderately confident. Review recommended.";
    return "Low confidence — AI is uncertain about this extraction. Manual verification required.";
  };

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium cursor-default",
            getColor(confidence)
          )}
        >
          {Math.round(confidence)}%
          {showLabel && <span className="ml-0.5">{getLabel(confidence)}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{getTooltip(confidence)}</p>
      </TooltipContent>
    </Tooltip>
  );
}
