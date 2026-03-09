"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { History, ArrowRight } from "lucide-react";
import type { FieldCorrection } from "@/lib/types";

export function CorrectionTimeline({
  corrections,
}: {
  corrections: FieldCorrection[];
}) {
  if (!corrections.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Correction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No corrections have been made to this document.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Correction History (
          {corrections.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {corrections.map((correction) => (
            <div
              key={correction.id}
              className="flex gap-3 border-l-2 border-muted pl-4 pb-4 last:pb-0"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm capitalize">
                    {correction.field_name.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    by {correction.corrected_by || "User"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground line-through">
                    {correction.original_value || "(empty)"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {correction.corrected_value}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(
                    new Date(correction.corrected_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
