"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  FileText,
  Target,
  AlertTriangle,
  Database,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  AccuracyAnalytics,
  CorrectionStats,
  FieldBreakdownItem,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stringifyCopilotContext } from "@/lib/copilot-context";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/layout/page-transition";

function formatFieldName(name: string): string {
  const isLineItem = name.startsWith("line_item.");
  const cleanName = isLineItem ? name.slice("line_item.".length) : name;
  const formatted = cleanName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return isLineItem ? `LI: ${formatted}` : formatted;
}

function getAccuracyBadgeVariant(
  rate: number
): "default" | "secondary" | "destructive" | "outline" {
  if (rate >= 95) return "default";
  if (rate >= 80) return "secondary";
  if (rate >= 60) return "outline";
  return "destructive";
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tooltip,
  accent,
  iconColor,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  accent?: string;
  iconColor?: string;
}) {
  const card = (
    <Card className={`h-full ${accent ? `border-l-4 ${accent}` : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 shrink-0 ${iconColor || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </CardContent>
    </Card>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger render={<div className="min-w-0" />}>
        {card}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// Chart configs
const accuracyConfig: ChartConfig = {
  accuracy_rate: {
    label: "Accuracy",
    color: "hsl(var(--chart-1))",
  },
};

const correctionsConfig: ChartConfig = {
  count: {
    label: "Corrections",
    color: "hsl(0, 84%, 60%)",
  },
};

const confidenceConfig: ChartConfig = {
  confidence: {
    label: "Confidence",
    color: "hsl(var(--chart-2))",
  },
};

export default function AnalyticsPage() {
  const { data: accuracy, isLoading: accuracyLoading } =
    useQuery<AccuracyAnalytics>({
      queryKey: ["analytics", "accuracy"],
      queryFn: () => api.analytics.accuracy(),
    });

  const { data: corrections, isLoading: correctionsLoading } =
    useQuery<CorrectionStats>({
      queryKey: ["analytics", "corrections"],
      queryFn: () => api.analytics.corrections(),
    });

  const { data: fieldBreakdown, isLoading: fieldBreakdownLoading } =
    useQuery<FieldBreakdownItem[]>({
      queryKey: ["analytics", "field-breakdown"],
      queryFn: () => api.analytics.fieldBreakdown(),
    });

  const fieldAccuracyData = (fieldBreakdown ?? []).map((item) => ({
    name: formatFieldName(item.field_name),
    accuracy_rate: Number((item.accuracy_rate ?? 0).toFixed(1)),
    fill: (item.accuracy_rate ?? 0) >= 90 ? "var(--color-high)" : (item.accuracy_rate ?? 0) >= 70 ? "var(--color-medium)" : "var(--color-low)",
  }));

  const topCorrectedData = (corrections?.top_corrected_fields ?? []).map(
    (item) => ({
      name: formatFieldName(item.field_name),
      count: item.count,
    })
  );

  const confidenceData = (fieldBreakdown ?? []).map((item) => ({
    name: formatFieldName(item.field_name),
    confidence:
      item.average_confidence != null
        ? Number(item.average_confidence.toFixed(1))
        : 0,
    fill: (item.average_confidence ?? 0) >= 90 ? "var(--color-high)" : (item.average_confidence ?? 0) >= 70 ? "var(--color-medium)" : "var(--color-low)",
  }));

  const copilotFieldBreakdown = (fieldBreakdown ?? []).map((f) => ({
    field_name: f.field_name,
    total_extractions: f.total_extractions,
    average_confidence: f.average_confidence,
    correction_count: f.correction_count,
    accuracy_rate: f.accuracy_rate,
  }));

  return (
    <PageTransition>
    <div
      className="space-y-6"
      data-copilot-context={stringifyCopilotContext({
        page: "analytics",
        analytics: accuracy
          ? {
              total_documents: accuracy.total_documents,
              total_extractions: accuracy.total_extractions,
              average_confidence: accuracy.average_confidence,
              correction_rate: accuracy.correction_rate,
              documents_with_corrections: accuracy.documents_with_corrections,
              total_fields_extracted: accuracy.total_fields_extracted,
              fields_corrected: accuracy.fields_corrected,
            }
          : null,
        analyticsFieldBreakdown: copilotFieldBreakdown,
      })}
    >
      {/* Stat Cards */}
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour="analytics-cards">
        {accuracyLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : accuracy ? (
          <>
            <StaggerItem><StatCard
              title="Total Documents"
              value={accuracy.total_documents.toLocaleString()}
              description={`${accuracy.total_extractions.toLocaleString()} total extractions`}
              icon={FileText}
              accent="border-l-blue-500"
              iconColor="text-blue-500"
              tooltip="Total number of documents processed through the AI extraction pipeline"
            /></StaggerItem>
            <StaggerItem><StatCard
              title="Avg Confidence"
              value={accuracy.average_confidence != null ? `${accuracy.average_confidence.toFixed(1)}%` : "N/A"}
              description="Across all extracted fields"
              icon={Target}
              accent="border-l-teal-500"
              iconColor="text-teal-500"
              tooltip="Average AI confidence score across all extraction fields. Higher values indicate more reliable extractions."
            /></StaggerItem>
            <StaggerItem><StatCard
              title="Correction Rate"
              value={accuracy.correction_rate != null ? `${accuracy.correction_rate.toFixed(1)}%` : "0%"}
              description={`${accuracy.documents_with_corrections ?? 0} documents corrected`}
              icon={AlertTriangle}
              accent="border-l-amber-500"
              iconColor="text-amber-500"
              tooltip="Percentage of documents that required manual corrections. Lower is better."
            /></StaggerItem>
            <StaggerItem><StatCard
              title="Fields Extracted"
              value={accuracy.total_fields_extracted.toLocaleString()}
              description={`${accuracy.fields_corrected.toLocaleString()} fields corrected`}
              icon={Database}
              accent="border-l-violet-500"
              iconColor="text-violet-500"
              tooltip="Total number of individual data fields extracted by AI across all documents"
            /></StaggerItem>
          </>
        ) : (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            No analytics data available.
          </div>
        )}
      </StaggerContainer>

      {/* Charts */}
      <Tabs defaultValue="field-accuracy" className="space-y-4">
        <TabsList data-tour="analytics-tabs">
          <TabsTrigger value="field-accuracy">Field Accuracy</TabsTrigger>
          <TabsTrigger value="corrections">Corrections</TabsTrigger>
          <TabsTrigger value="confidence">Confidence</TabsTrigger>
        </TabsList>

        <TabsContent value="field-accuracy">
          <Card>
            <CardHeader>
              <CardTitle>Field Accuracy Rate</CardTitle>
              <CardDescription>
                Percentage of extractions that didn&apos;t require corrections per field
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fieldBreakdownLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : fieldAccuracyData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No field breakdown data available.
                </div>
              ) : (
                <ChartContainer
                  config={accuracyConfig}
                  className="aspect-auto h-[400px] w-full"
                  style={{ "--color-high": "#10b981", "--color-medium": "#f59e0b", "--color-low": "#ef4444" } as React.CSSProperties}
                >
                  <BarChart data={fieldAccuracyData} margin={{ bottom: 80 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <span className="font-semibold">{value}%</span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="accuracy_rate" radius={[6, 6, 0, 0]}>
                      {fieldAccuracyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.accuracy_rate >= 90 ? "#10b981" : entry.accuracy_rate >= 70 ? "#f59e0b" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 font-medium leading-none">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> High (90%+)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Medium (70-89%)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" /> Low (&lt;70%)
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="corrections">
          <Card>
            <CardHeader>
              <CardTitle>Top Corrected Fields</CardTitle>
              <CardDescription>
                Fields most frequently corrected by reviewers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {correctionsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : topCorrectedData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No correction data available.
                </div>
              ) : (
                <ChartContainer
                  config={correctionsConfig}
                  className="aspect-auto h-[400px] w-full"
                >
                  <BarChart data={topCorrectedData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={160}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Fields with more corrections may need extraction prompt tuning
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="confidence">
          <Card>
            <CardHeader>
              <CardTitle>Average Confidence by Field</CardTitle>
              <CardDescription>
                AI confidence score averaged across all documents per field
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fieldBreakdownLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : confidenceData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No confidence data available.
                </div>
              ) : (
                <ChartContainer
                  config={confidenceConfig}
                  className="aspect-auto h-[400px] w-full"
                  style={{ "--color-high": "#10b981", "--color-medium": "#0d9488", "--color-low": "#f59e0b" } as React.CSSProperties}
                >
                  <BarChart data={confidenceData} margin={{ bottom: 80 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <span className="font-semibold">{value}%</span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="confidence" radius={[6, 6, 0, 0]}>
                      {confidenceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.confidence >= 90 ? "#10b981" : entry.confidence >= 70 ? "#0d9488" : "#f59e0b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 font-medium leading-none">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> High (90%+)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Medium (70-89%)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Low (&lt;70%)
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Field Breakdown Table */}
      <Card data-tour="analytics-breakdown">
        <CardHeader>
          <CardTitle>Field Breakdown</CardTitle>
          <CardDescription>Detailed per-field extraction metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {fieldBreakdownLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !fieldBreakdown || fieldBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No field breakdown data available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead className="text-right">
                    Total Extractions
                  </TableHead>
                  <TableHead className="text-right">Avg Confidence</TableHead>
                  <TableHead className="text-right">Corrections</TableHead>
                  <TableHead className="text-right">Accuracy Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldBreakdown.map((field) => (
                  <TableRow key={field.field_name}>
                    <TableCell className="font-medium">
                      {formatFieldName(field.field_name)}
                    </TableCell>
                    <TableCell className="text-right">
                      {field.total_extractions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {field.average_confidence != null
                        ? `${field.average_confidence.toFixed(1)}%`
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {field.correction_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={getAccuracyBadgeVariant(field.accuracy_rate ?? 0)}
                      >
                        {(field.accuracy_rate ?? 0).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
