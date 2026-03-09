"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, Eye, FileText as FileTextIcon, Package, Ship as ShipIcon, Files } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { ConfidenceBadge } from "../extraction/confidence-badge";
import type { DocumentSummary } from "@/lib/types";

const DOC_TYPE_ICONS: Record<string, { icon: typeof FileTextIcon; color: string }> = {
  commercial_invoice: { icon: FileTextIcon, color: "text-blue-500" },
  packing_list: { icon: Package, color: "text-teal-500" },
  bill_of_lading: { icon: ShipIcon, color: "text-indigo-500" },
  combined: { icon: Files, color: "text-violet-500" },
};

function CellWithTooltip({
  value,
  className,
  fallback = "--",
}: {
  value: string | null | undefined;
  className?: string;
  fallback?: string;
}) {
  if (!value) {
    return <span className="text-muted-foreground text-sm">{fallback}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<span className={className} />}>
        {value}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">{value}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const columns: ColumnDef<DocumentSummary>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "invoice_number",
    header: "Reference",
    cell: ({ row }) => {
      const ref = row.original.invoice_number || row.original.file_name;
      const docType = row.original.document_type;
      const typeConfig = DOC_TYPE_ICONS[docType] || DOC_TYPE_ICONS.commercial_invoice;
      const TypeIcon = typeConfig.icon;
      return (
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 ${typeConfig.color}`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-block min-w-0" />}>
              <Link
                href={`/documents/${row.original.id}`}
                className="font-medium text-sm hover:underline max-w-[200px] whitespace-normal break-words block text-primary leading-snug"
              >
                {ref}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-sm">{row.original.file_name}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
  {
    accessorKey: "shipper_name",
    header: ({ column }) => (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Shipper <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Click to sort by shipper name</TooltipContent>
      </Tooltip>
    ),
    cell: ({ row }) => (
      <CellWithTooltip
        value={row.original.shipper_name}
        className="max-w-[260px] whitespace-normal break-words block text-sm leading-snug"
      />
    ),
  },
  {
    accessorKey: "consignee_name",
    header: "Consignee",
    cell: ({ row }) => (
      <CellWithTooltip
        value={row.original.consignee_name}
        className="max-w-[260px] whitespace-normal break-words block text-sm leading-snug"
      />
    ),
  },
  {
    accessorKey: "status",
    header: () => (
      <Tooltip>
        <TooltipTrigger render={<span className="cursor-default" />}>
          Status
        </TooltipTrigger>
        <TooltipContent>Document processing status</TooltipContent>
      </Tooltip>
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "overall_confidence",
    header: () => (
      <Tooltip>
        <TooltipTrigger render={<span className="cursor-default" />}>
          Conf.
        </TooltipTrigger>
        <TooltipContent>
          AI confidence score for extracted data (0-100%)
        </TooltipContent>
      </Tooltip>
    ),
    cell: ({ row }) => {
      const confidence = row.original.overall_confidence;
      if (!confidence)
        return <span className="text-muted-foreground text-sm">--</span>;
      return <ConfidenceBadge confidence={confidence} />;
    },
  },
  {
    accessorKey: "uploaded_at",
    header: ({ column }) => (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Date <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Click to sort by upload date</TooltipContent>
      </Tooltip>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.uploaded_at);
      return (
        <Tooltip>
          <TooltipTrigger render={<span className="text-sm text-muted-foreground whitespace-nowrap" />}>
            {format(date, "MMM d, yyyy")}
          </TooltipTrigger>
          <TooltipContent>
            {format(date, "MMMM d, yyyy 'at' h:mm a")}
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Link href={`/documents/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>View document details</TooltipContent>
      </Tooltip>
    ),
  },
];
