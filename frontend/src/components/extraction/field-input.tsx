"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfidenceBadge } from "./confidence-badge";
import { cn } from "@/lib/utils";

interface FieldInputProps {
  label: string;
  value: string;
  confidence?: number;
  onChange: (value: string) => void;
  isModified?: boolean;
  multiline?: boolean;
  error?: string;
}

export function FieldInput({
  label,
  value,
  confidence,
  onChange,
  isModified,
  multiline,
  error,
}: FieldInputProps) {
  const isLowConfidence = confidence !== undefined && confidence < 70;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label
          className={cn(
            "text-xs",
            isModified && "text-blue-600 dark:text-blue-400"
          )}
        >
          {label}
          {isModified && <span className="ml-1 text-[10px]">(edited)</span>}
        </Label>
        {confidence !== undefined && <ConfidenceBadge confidence={confidence} />}
      </div>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "min-h-[60px] text-sm",
            isLowConfidence && "border-amber-400 dark:border-amber-600",
            isModified &&
              "border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-950/30",
            error && "border-destructive focus-visible:border-destructive"
          )}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "text-sm",
            isLowConfidence && "border-amber-400 dark:border-amber-600",
            isModified &&
              "border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-950/30",
            error && "border-destructive focus-visible:border-destructive"
          )}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
