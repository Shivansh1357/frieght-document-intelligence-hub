"use client";

import { motion } from "framer-motion";
import { AlertTriangle, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

interface DuplicateMatch {
  id: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  invoice_number?: string | null;
}

interface DuplicateAlertProps {
  matches: DuplicateMatch[];
  onProceed: () => void;
  onCancel: () => void;
}

export function DuplicateAlert({
  matches,
  onProceed,
  onCancel,
}: DuplicateAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/30 bg-amber-50 p-5 dark:bg-amber-950/20"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Possible Duplicate Detected
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              This document may already exist in the system. Review the
              match{matches.length > 1 ? "es" : ""} below before proceeding.
            </p>
          </div>

          {/* Matching documents */}
          <div className="space-y-2">
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white/60 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {match.invoice_number || match.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {format(new Date(match.uploaded_at), "MMM d, yyyy")}
                      <span className="mx-1">-</span>
                      {match.status}
                    </p>
                  </div>
                </div>
                <Link href={`/documents/${match.id}`} target="_blank">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
            >
              Cancel Upload
            </Button>
            <Button
              size="sm"
              onClick={onProceed}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Upload Anyway
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
