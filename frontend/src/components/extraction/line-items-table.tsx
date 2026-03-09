"use client";

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
import { ConfidenceBadge } from "./confidence-badge";
import { Package } from "lucide-react";
import type { LineItem } from "@/lib/types";

export function LineItemsTable({ items }: { items: LineItem[] }) {
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Line Items ({items.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Hover over cells to see full content
          </p>
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
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger render={<span className="inline-flex" />}>
                        <p className="min-w-[200px] max-w-[350px] text-sm font-medium leading-snug whitespace-normal break-words">
                          {item.description}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-md"
                      >
                        <p className="text-sm">{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.item_number || (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.hs_code ? (
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <span className="cursor-default">
                            {item.hs_code}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>HS Code: {item.hs_code}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.quantity?.toLocaleString() ?? (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.unit || (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.unit_price != null ? (
                      `$${Number(item.unit_price).toFixed(2)}`
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.total_amount != null ? (
                      `$${Number(item.total_amount).toLocaleString()}`
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.net_weight != null ? (
                      `${Number(item.net_weight).toLocaleString()} ${item.weight_unit}`
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.gross_weight != null ? (
                      `${Number(item.gross_weight).toLocaleString()} ${item.weight_unit}`
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
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
