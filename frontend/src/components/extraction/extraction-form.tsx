"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FieldInput } from "./field-input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getUserProfile } from "@/lib/user-store";
import type { ExtractedData, ExtractionField } from "@/lib/types";
import { validateCorrectionField } from "@/lib/field-validations";

interface ExtractionFormProps {
  documentId: string;
  extractedData: ExtractedData;
  extractionFields: ExtractionField[];
  onSaved?: () => void;
}

const FIELD_SECTIONS = [
  {
    title: "Parties",
    fields: [
      { key: "shipper_name", label: "Shipper Name" },
      { key: "shipper_address", label: "Shipper Address", multiline: true },
      { key: "consignee_name", label: "Consignee Name" },
      {
        key: "consignee_address",
        label: "Consignee Address",
        multiline: true,
      },
    ],
  },
  {
    title: "Shipping Details",
    fields: [
      { key: "vessel_name", label: "Vessel Name" },
      { key: "voyage_number", label: "Voyage Number" },
      { key: "mbl_number", label: "MBL Number" },
      { key: "hbl_number", label: "HBL Number" },
      { key: "port_of_lading", label: "Port of Lading" },
      { key: "port_of_discharge", label: "Port of Discharge" },
    ],
  },
  {
    title: "Trade Details",
    fields: [
      { key: "country_of_origin", label: "Country of Origin" },
      { key: "country_of_destination", label: "Destination Country" },
      { key: "incoterms", label: "Incoterms" },
      { key: "payment_terms", label: "Payment Terms" },
    ],
  },
  {
    title: "Values & Weights",
    fields: [
      { key: "total_declared_value", label: "Declared Value" },
      { key: "currency", label: "Currency" },
      { key: "total_gross_weight", label: "Gross Weight" },
      { key: "total_net_weight", label: "Net Weight" },
      { key: "weight_unit", label: "Weight Unit" },
      { key: "total_packages", label: "Total Packages" },
      { key: "package_type", label: "Package Type" },
    ],
  },
  {
    title: "References",
    fields: [
      { key: "invoice_number", label: "Invoice Number" },
      { key: "document_date", label: "Document Date" },
      { key: "reference_numbers", label: "Reference Numbers" },
      { key: "container_numbers", label: "Container Numbers" },
    ],
  },
];

export function ExtractionForm({
  documentId,
  extractedData,
  extractionFields,
  onSaved,
}: ExtractionFormProps) {
  // Build confidence map from extraction fields
  const confidenceMap = useMemo(() => {
    const map: Record<string, number> = {};
    extractionFields.forEach((f) => {
      if (f.confidence_score != null) map[f.field_name] = f.confidence_score;
    });
    return map;
  }, [extractionFields]);

  // Track edited values
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const getValue = (key: string): string => {
    if (editedValues[key] !== undefined) return editedValues[key];
    const val = (extractedData as unknown as Record<string, unknown>)[key];
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const getOriginalValue = (key: string): string => {
    const val = (extractedData as unknown as Record<string, unknown>)[key];
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const hasChanges = Object.keys(editedValues).some(
    (key) => editedValues[key] !== getOriginalValue(key)
  );

  const handleSave = async () => {
    const corrections: Record<string, string> = {};
    const nextErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(editedValues)) {
      if (value !== getOriginalValue(key)) {
        const res = validateCorrectionField(key, value);
        if (!res.ok) {
          nextErrors[key] = res.error || "Invalid value";
        } else {
          corrections[key] = res.normalized;
        }
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error("Please fix the highlighted fields before saving.");
      return;
    }
    if (Object.keys(corrections).length === 0) return;

    setIsSaving(true);
    try {
      const profile = getUserProfile();
      await api.documents.update(documentId, {
        corrections,
        status: "reviewed",
        corrected_by: profile.name,
      });
      toast.success(
        `${Object.keys(corrections).length} field(s) corrected and saved.`
      );
      setEditedValues({});
      setFieldErrors({});
      onSaved?.();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to save corrections.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedValues({});
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {extractedData.overall_confidence != null && (
            <Tooltip>
              <TooltipTrigger
                render={<span className="inline-flex" />}
              >
                <div className="flex items-center gap-2 cursor-help">
                  <div className="relative h-8 w-8">
                    <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50" />
                      <circle
                        cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                        strokeDasharray={`${(extractedData.overall_confidence / 100) * 88} 88`}
                        strokeLinecap="round"
                        className={
                          extractedData.overall_confidence >= 90
                            ? "text-emerald-500"
                            : extractedData.overall_confidence >= 70
                              ? "text-amber-500"
                              : "text-red-500"
                        }
                        stroke="currentColor"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">
                      {Math.round(extractedData.overall_confidence)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      confidence
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">Overall confidence</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A summary of how certain the AI is about the extracted fields in this document.
                  Use it as a prioritization signal — it’s not a guarantee.
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li><span className="font-medium text-emerald-600 dark:text-emerald-400">90%+</span> high confidence</li>
                  <li><span className="font-medium text-amber-600 dark:text-amber-400">70–89%</span> medium (review key fields)</li>
                  <li><span className="font-medium text-red-600 dark:text-red-400">&lt;70%</span> low (expect corrections)</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-3 w-3" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Discard all unsaved changes
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                <Save className="mr-2 h-3 w-3" />
                {isSaving ? "Saving..." : "Save Corrections"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasChanges
                ? "Save corrections to the audit trail"
                : "Edit fields to enable saving"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Sections */}
      {FIELD_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  label={field.label}
                  value={getValue(field.key)}
                  confidence={confidenceMap[field.key]}
                  onChange={(val) => handleChange(field.key, val)}
                  isModified={
                    editedValues[field.key] !== undefined &&
                    editedValues[field.key] !== getOriginalValue(field.key)
                  }
                  multiline={"multiline" in field ? field.multiline : undefined}
                  error={fieldErrors[field.key]}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
