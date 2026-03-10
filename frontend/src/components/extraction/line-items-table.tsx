"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfidenceBadge } from "./confidence-badge";
import { Package, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getUserProfile } from "@/lib/user-store";
import type { LineItem } from "@/lib/types";

// Fields that can be edited on a line item
const EDITABLE_FIELDS = [
  "description",
  "item_number",
  "hs_code",
  "quantity",
  "unit",
  "unit_price",
  "total_amount",
  "net_weight",
  "gross_weight",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

// Key: `${lineItemId}:${fieldName}`
type EditMap = Record<string, string>;

interface LineItemsTableProps {
  items: LineItem[];
  documentId: string;
  onSaved?: () => void;
}

export function LineItemsTable({ items, documentId, onSaved }: LineItemsTableProps) {
  const [editedValues, setEditedValues] = useState<EditMap>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editKey = (itemId: string, field: string) => `${itemId}:${field}`;

  const hasChanges = Object.keys(editedValues).length > 0;

  const getDisplayValue = useCallback(
    (item: LineItem, field: EditableField): string => {
      const key = editKey(item.id, field);
      if (key in editedValues) return editedValues[key];
      const val = item[field];
      if (val == null) return "";
      return String(val);
    },
    [editedValues]
  );

  const getOriginalValue = (item: LineItem, field: EditableField): string => {
    const val = item[field];
    if (val == null) return "";
    return String(val);
  };

  const isEdited = (item: LineItem, field: EditableField): boolean => {
    const key = editKey(item.id, field);
    return key in editedValues;
  };

  const handleChange = (itemId: string, field: EditableField, value: string) => {
    const key = editKey(itemId, field);
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCellClick = (itemId: string, field: EditableField) => {
    setEditingCell(editKey(itemId, field));
  };

  const handleBlur = (item: LineItem, field: EditableField) => {
    const key = editKey(item.id, field);
    setEditingCell(null);
    // Remove from edited if value matches original
    if (key in editedValues && editedValues[key] === getOriginalValue(item, field)) {
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleReset = () => {
    setEditedValues({});
    setEditingCell(null);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);

    try {
      const profile = getUserProfile();
      const entries = Object.entries(editedValues);

      for (const [key, value] of entries) {
        const [lineItemId, fieldName] = key.split(":");
        const item = items.find((i) => i.id === lineItemId);
        const originalValue = item ? getOriginalValue(item, fieldName as EditableField) : null;

        await api.documents.createCorrection(documentId, {
          field_name: fieldName,
          corrected_value: value,
          original_value: originalValue || undefined,
          line_item_id: lineItemId,
          corrected_by: profile.name || "user",
        });
      }

      toast.success(`Saved ${entries.length} line item correction${entries.length > 1 ? "s" : ""}`);
      setEditedValues({});
      setEditingCell(null);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save corrections");
    } finally {
      setSaving(false);
    }
  };

  if (!items.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No line items were extracted from this document.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCell = (item: LineItem, field: EditableField, align: "left" | "right" = "left") => {
    const key = editKey(item.id, field);
    const isActive = editingCell === key;
    const edited = isEdited(item, field);
    const value = getDisplayValue(item, field);

    if (isActive) {
      return (
        <Input
          autoFocus
          value={value}
          onChange={(e) => handleChange(item.id, field, e.target.value)}
          onBlur={() => handleBlur(item, field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBlur(item, field);
            if (e.key === "Escape") {
              setEditingCell(null);
              if (key in editedValues && editedValues[key] === getOriginalValue(item, field)) {
                setEditedValues((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              }
            }
          }}
          className={`h-7 text-xs px-1.5 ${align === "right" ? "text-right font-mono" : ""}`}
        />
      );
    }

    return (
      <span
        onClick={() => handleCellClick(item.id, field)}
        className={`cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-muted/50 whitespace-normal break-words ${
          edited ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : ""
        } ${align === "right" ? "font-mono" : ""} ${!value ? "text-muted-foreground" : ""}`}
      >
        {value || "--"}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Line Items ({items.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Click any cell to edit
            </p>
            {hasChanges && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 text-xs"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-7 text-xs"
                >
                  <Save className="mr-1 h-3 w-3" />
                  {saving ? "Saving..." : `Save ${Object.keys(editedValues).length} correction${Object.keys(editedValues).length > 1 ? "s" : ""}`}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[250px]">Description</TableHead>
                <TableHead>Item #</TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <span className="cursor-default">HS Code</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Harmonized System commodity classification code
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Net Wt</TableHead>
                <TableHead className="text-right">Gross Wt</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.line_number}
                  </TableCell>
                  <TableCell className="min-w-[200px] max-w-[350px]">
                    {renderCell(item, "description")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {renderCell(item, "item_number")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {renderCell(item, "hs_code")}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderCell(item, "quantity", "right")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {renderCell(item, "unit")}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderCell(item, "unit_price", "right")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {renderCell(item, "total_amount", "right")}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {renderCell(item, "net_weight", "right")}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {renderCell(item, "gross_weight", "right")}
                  </TableCell>
                  <TableCell>
                    {item.confidence != null ? (
                      <ConfidenceBadge confidence={item.confidence} />
                    ) : (
                      <span className="text-muted-foreground text-sm">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
