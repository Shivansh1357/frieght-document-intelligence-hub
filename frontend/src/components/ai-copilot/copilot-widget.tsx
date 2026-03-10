"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  X,
  Send,
  User,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const COPILOT_NAME = "Sofia";

interface PageContext {
  page: string;
  pathname: string;
  stats?: Record<string, string>;
  documents?: Array<{ name: string; status: string; confidence: string }>;
  payload?: unknown;
  compare?: {
    doc1?: { id: string; name: string };
    doc2?: { id: string; name: string };
    matchPercentage?: number;
    mismatchedFields?: number;
    matchingFields?: number;
    totalFields?: number;
  };
  documentDetail?: {
    fileName: string;
    status: string;
    invoiceNumber: string;
    shipper: string;
    consignee: string;
    value: string;
    weight: string;
    lineItemCount: string;
    correctionsCount: string;
    confidence: string;
  };
  analytics?: {
    totalDocs: string;
    avgConfidence: string;
    correctionRate: string;
    fieldsExtracted: string;
  };
  analyticsFieldBreakdown?: Array<{
    field_name: string;
    total_extractions: number;
    average_confidence: number | null;
    correction_count: number;
    accuracy_rate: number;
  }>;
  ui?: {
    headings: string[];
    activeTabs: string[];
    cards: Record<string, string>;
    tables: Array<{ headers: string[]; rows: string[][] }>;
    selectValues: string[];
  };
  activeTab?: string;
  cardTexts?: string[];
}

function readPageContext(pathname: string): PageContext {
  const ctx: PageContext = { page: "unknown", pathname };

  const getActiveTabLabel = (): string | undefined => {
    const selectors = [
      // Base UI (current)
      '[role="tab"][data-active]',
      '[data-slot="tabs-trigger"][data-active]',
      // Radix-style
      '[role="tab"][data-state="active"]',
      // ARIA (generic)
      '[role="tab"][aria-selected="true"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      const text = el?.textContent?.trim();
      if (text) return text;
    }
    return undefined;
  };

  // Prefer a stable, page-provided payload when available.
  const payloadEl = document.querySelector(
    "[data-copilot-context]"
  ) as HTMLElement | null;
  const payloadRaw = payloadEl?.dataset?.copilotContext;
  if (payloadRaw) {
    try {
      const parsed = JSON.parse(payloadRaw);
      ctx.payload = parsed;

      if (parsed && typeof parsed === "object") {
        const p = parsed as any;
        if (p.stats) ctx.stats = p.stats;
        if (p.documents) ctx.documents = p.documents;
        if (p.compare) ctx.compare = p.compare;
        if (p.documentDetail) ctx.documentDetail = p.documentDetail;
        if (p.analytics) ctx.analytics = p.analytics;
        if (p.analyticsFieldBreakdown)
          ctx.analyticsFieldBreakdown = p.analyticsFieldBreakdown;
      }
    } catch {
      // ignore
    }
  }

  const readUniversalUi = () => {
    const headings = Array.from(document.querySelectorAll("h1, h2"))
      .map((h) => h.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 6);

    const activeTabs = (() => {
      const label = getActiveTabLabel();
      return label ? [label] : [];
    })();

    const cards: Record<string, string> = {};
    const cardEls = document.querySelectorAll('[data-slot="card"]');
    cardEls.forEach((card) => {
      const title = card
        .querySelector('[data-slot="card-title"]')
        ?.textContent?.trim();
      const value = card
        .querySelector('[data-slot="card-content"]')
        ?.textContent?.trim();
      if (title && value) cards[title] = value.split("\n")[0].trim();
    });

    const tables = Array.from(
      document.querySelectorAll("table[data-slot='table'], table")
    )
      .slice(0, 4)
      .map((table) => {
        const headers = Array.from(table.querySelectorAll("thead th"))
          .map((th) => th.textContent?.trim() || "")
          .filter(Boolean);
        const rows = Array.from(table.querySelectorAll("tbody tr"))
          .slice(0, 25)
          .map((tr) =>
            Array.from(tr.querySelectorAll("td")).map(
              (td) => td.textContent?.trim().replace(/\s+/g, " ") || ""
            )
          )
          .filter((r) => r.some(Boolean));
        return { headers, rows };
      })
      .filter((t) => t.headers.length > 0 && t.rows.length > 0);

    const selectValues = Array.from(
      document.querySelectorAll("[data-slot='select-trigger']")
    )
      .map((el) => el.textContent?.trim().replace(/\s+/g, " ") || "")
      .filter(Boolean)
      .slice(0, 10);

    ctx.ui = { headings, activeTabs, cards, tables, selectValues };
  };

  // Determine page type
  if (pathname === "/") {
    ctx.page = "dashboard";
    // Read stat cards
    const statCards = document.querySelectorAll('[data-slot="card"]');
    const stats: Record<string, string> = {};
    statCards.forEach((card) => {
      const title = card.querySelector('[data-slot="card-title"]')?.textContent?.trim();
      const value = card.querySelector('[data-slot="card-content"]')?.textContent?.trim();
      if (title && value) {
        stats[title] = value.split("\n")[0].trim();
      }
    });
    ctx.stats = stats;

    // Read table rows
    const rows = document.querySelectorAll("tbody tr");
    const docs: Array<{ name: string; status: string; confidence: string }> = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 5) {
        docs.push({
          name: cells[0]?.textContent?.trim() || "",
          status: cells[3]?.textContent?.trim() || "",
          confidence: cells[4]?.textContent?.trim() || "",
        });
      }
    });
    ctx.documents = docs;
  } else if (pathname === "/upload") {
    ctx.page = "upload";
  } else if (pathname === "/analytics") {
    ctx.page = "analytics";
    const statCards = document.querySelectorAll('[data-slot="card"]');
    const analytics: Record<string, string> = {};
    statCards.forEach((card) => {
      const title = card.querySelector('[data-slot="card-title"]')?.textContent?.trim();
      const value = card.querySelector('[data-slot="card-content"]')?.textContent?.trim();
      if (title && value) {
        analytics[title] = value.split("\n")[0].trim();
      }
    });
    if (Object.keys(analytics).length > 0) {
      ctx.analytics = {
        totalDocs: analytics["Total Documents"] || "N/A",
        avgConfidence: analytics["Avg Confidence"] || "N/A",
        correctionRate: analytics["Correction Rate"] || "N/A",
        fieldsExtracted: analytics["Fields Extracted"] || "N/A",
      };
    }
    // Read active tab (robust selectors across tab libs)
    ctx.activeTab = getActiveTabLabel();

    // Back-compat (older builds): read analytics payload if present.
    const root = document.querySelector(
      "[data-copilot-analytics='true']"
    ) as HTMLElement | null;
    const raw = root?.dataset?.analyticsFieldBreakdown;
    if (!ctx.analyticsFieldBreakdown && raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) ctx.analyticsFieldBreakdown = parsed;
      } catch {
        // ignore
      }
    }
  } else if (pathname === "/compare") {
    ctx.page = "compare";
    if (!ctx.compare) {
      // Fallback: infer from visible UI if the data payload isn't present.
      const triggers = Array.from(
        document.querySelectorAll("[data-slot='select-trigger']")
      ).map((t) => t.textContent?.trim().replace(/\s+/g, " ") || "");
      const d1 = triggers[0] || "";
      const d2 = triggers[1] || "";

      const mismatchText =
        document.body.textContent?.match(/(\d+)\s+field\(s\)\s+differ/i)?.[1] ||
        "";
      const mismatchedFields = mismatchText ? Number(mismatchText) : undefined;

      ctx.compare = {
        doc1: d1 ? { id: "", name: d1 } : undefined,
        doc2: d2 ? { id: "", name: d2 } : undefined,
        mismatchedFields:
          Number.isFinite(mismatchedFields ?? NaN) ? mismatchedFields : undefined,
      };
    }
  } else if (pathname.startsWith("/documents/")) {
    ctx.page = "document-detail";
    // Read document detail from DOM
    const heading = document.querySelector("h2")?.textContent?.trim();
    const badges = document.querySelectorAll('[data-slot="badge"]');
    const badgeTexts = Array.from(badges).map((b) => b.textContent?.trim() || "");

    // Read summary cards
    const cards = document.querySelectorAll('[data-slot="card-content"]');
    const cardTexts: string[] = [];
    cards.forEach((card) => {
      const text = card.textContent?.trim();
      if (text) cardTexts.push(text);
    });

    // Read tabs
    ctx.activeTab = getActiveTabLabel();

    // Read correction count from tab
    const correctionTab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find((t) => t.textContent?.includes("Corrections"));
    const corrCountMatch = correctionTab?.textContent?.match(/\((\d+)\)/);

    const lineItemTab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find((t) => t.textContent?.includes("Line Items"));
    const lineCountMatch = lineItemTab?.textContent?.match(/\((\d+)\)/);

    ctx.documentDetail = {
      fileName: heading || "Unknown",
      status: badgeTexts[0] || "unknown",
      invoiceNumber: cardTexts[0]?.replace("Invoice #", "").trim() || "",
      shipper: "",
      consignee: "",
      value: cardTexts[2] || "",
      weight: cardTexts[3] || "",
      lineItemCount: lineCountMatch?.[1] || "0",
      correctionsCount: corrCountMatch?.[1] || "0",
      confidence: "",
    };
    ctx.cardTexts = cardTexts;
  }

  // Always capture universal UI context (works on every page)
  readUniversalUi();
  return ctx;
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  "/": [
    "How many documents do we have?",
    "Which documents need review?",
    "What is the overall confidence?",
    "Summarize the dashboard",
  ],
  "/upload": [
    "What file types can I upload?",
    "What happens after upload?",
    "How does AI extraction work?",
    "What is duplicate detection?",
  ],
  "/analytics": [
    "What does the analytics data show?",
    "Which fields have lowest accuracy?",
    "What does correction rate mean?",
    "How can I improve extraction quality?",
  ],
  "/compare": [
    "How does comparison work?",
    "What fields are compared?",
    "Why can't I select documents?",
  ],
};

const DOC_SUGGESTIONS = [
  "Tell me about this document",
  "What fields have low confidence?",
  "How many corrections were made?",
  "What are the line items?",
];

function generateContextAwareResponse(question: string, ctx: PageContext): string {
  const q = question.toLowerCase();

  // === DASHBOARD PAGE ===
  if (ctx.page === "dashboard") {
    if (q.includes("how many") && (q.includes("document") || q.includes("processed"))) {
      const total = ctx.stats?.["Total Documents"] || "unknown";
      const docList = ctx.documents || [];
      const statusCounts: Record<string, number> = {};
      docList.forEach((d) => {
        const s = d.status.toLowerCase();
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      const breakdown = Object.entries(statusCounts)
        .map(([s, c]) => `**${c}** ${s}`)
        .join(", ");
      return `You currently have **${total}** documents in the system.${
        breakdown ? `\n\nStatus breakdown on this page: ${breakdown}.` : ""
      }\n\nYou can upload more documents via the **Upload** page or filter existing ones using the status and type dropdowns.`;
    }

    if (q.includes("review") || q.includes("need attention") || q.includes("pending")) {
      const docs = ctx.documents || [];
      const needReview = docs.filter((d) =>
        d.status.toLowerCase() === "extracted"
      );
      if (needReview.length === 0) {
        return "All documents on this page have been reviewed or approved. Great work! Check if there are more pages using pagination.";
      }
      return `**${needReview.length}** document(s) need review:\n${needReview.map((d) => `- **${d.name}** (confidence: ${d.confidence})`).join("\n")}\n\nClick on any document to open it and review the extracted data.`;
    }

    if (q.includes("confidence") || q.includes("score")) {
      const avgConf = ctx.stats?.["Avg Confidence"] || "N/A";
      const docs = ctx.documents || [];
      const lowConf = docs.filter((d) => {
        const c = parseInt(d.confidence);
        return !isNaN(c) && c < 70;
      });
      return `The average confidence score is **${avgConf}**.\n\n${
        lowConf.length > 0
          ? `**${lowConf.length}** document(s) have low confidence (<70%):\n${lowConf.map((d) => `- ${d.name}: ${d.confidence}`).join("\n")}\n\nThese documents should be reviewed carefully.`
          : "All documents have acceptable confidence levels."
      }\n\nConfidence scores indicate how certain the AI is about extracted fields. **90%+** is high, **70-89%** is medium, and **<70%** needs careful review.`;
    }

    if (q.includes("summarize") || q.includes("summary") || q.includes("dashboard") || q.includes("overview")) {
      const total = ctx.stats?.["Total Documents"] || "0";
      const extracted = ctx.stats?.["Extracted"] || "0";
      const reviewed = ctx.stats?.["Reviewed"] || "0";
      const avgConf = ctx.stats?.["Avg Confidence"] || "N/A";
      return `**Dashboard Summary:**\n- **${total}** total documents in the system\n- **${extracted}** awaiting review (extracted)\n- **${reviewed}** reviewed/approved\n- Average confidence: **${avgConf}**\n\nUse the search bar to find specific documents by shipper, consignee, or invoice number. Use filters to narrow by status or document type.`;
    }
  }

  // === DOCUMENT DETAIL PAGE ===
  if (ctx.page === "document-detail") {
    const detail = ctx.documentDetail;

    if (q.includes("about this") || q.includes("tell me") || q.includes("summarize") || q.includes("summary")) {
      return `**Document: ${detail?.fileName}**\n- Status: **${detail?.status}**\n- Line Items: **${detail?.lineItemCount}**\n- Corrections: **${detail?.correctionsCount}**\n${detail?.value ? `- Value: ${detail.value}` : ""}\n${detail?.weight ? `- Weight: ${detail.weight}` : ""}\n\nYou're currently viewing the **${ctx.activeTab || "Extracted Data"}** tab. Switch tabs to see line items or correction history.`;
    }

    if (q.includes("correction")) {
      const count = detail?.correctionsCount || "0";
      return count === "0"
        ? "No corrections have been made to this document yet. If you spot any errors in the extracted data, edit the fields and click **Save Changes** to record corrections."
        : `**${count}** correction(s) have been made. Switch to the **Corrections** tab to see the full audit trail showing original vs corrected values, who made the change, and when.`;
    }

    if (q.includes("line item")) {
      return `This document has **${detail?.lineItemCount}** line item(s). Switch to the **Line Items** tab to see commodity descriptions, HS codes, quantities, weights, and values for each item.`;
    }

    if (q.includes("confidence") || q.includes("low confidence")) {
      return "Check the **Extracted Data** tab — each field shows a confidence badge. Fields with **amber** borders have medium confidence (70-89%) and should be verified. Fields with **red** badges (<70%) need manual review.\n\nYou can edit any field and save to create an immutable correction record.";
    }

    if (q.includes("approve")) {
      return detail?.status?.toLowerCase() === "approved"
        ? "This document has already been **approved**. No further action needed."
        : "To approve this document, click the **Approve** button in the top right. This marks the extraction as finalized. Make sure to review and correct any errors before approving.";
    }
  }

  // === ANALYTICS PAGE ===
  if (ctx.page === "analytics") {
    if (
      (q.includes("how many") || q.includes("number of")) &&
      (q.includes("field") || q.includes("fields")) &&
      (q.includes("12") || q.includes("twelve")) &&
      q.includes("extraction")
    ) {
      const rows = ctx.analyticsFieldBreakdown || [];
      if (rows.length === 0) {
        return "I can’t see the Field Breakdown table data yet. Scroll to the Field Breakdown section and try again.";
      }
      const matching = rows.filter((r) => r.total_extractions === 12);
      if (matching.length === 0) {
        return "There are **0** fields with exactly **12** total extractions on this page.";
      }
      return `There are **${matching.length}** field(s) with exactly **12** total extractions:\n${matching
        .map((m) => `- **${formatFieldName(m.field_name)}**`)
        .join("\n")}`;
    }

    if (q.includes("mbl") && q.includes("extraction")) {
      const rows = ctx.analyticsFieldBreakdown || [];
      const mbl = rows.find((r) => r.field_name.toLowerCase() === "mbl_number");
      if (mbl) {
        return `**MBL Number** has **${mbl.total_extractions}** total extractions on this page.`;
      }
    }

    // Generic UI-state fallback: try to answer "how many fields have X total extractions on this page"
    // using the visible Field Breakdown table if JSON payload is missing.
    if (
      (q.includes("how many") || q.includes("number of")) &&
      (q.includes("field") || q.includes("fields")) &&
      q.includes("total") &&
      q.includes("extraction") &&
      q.includes("on this page") &&
      !ctx.analyticsFieldBreakdown
    ) {
      const tables = ctx.ui?.tables || [];
      const breakdown = tables.find((t) =>
        t.headers.some((h) => h.toLowerCase().includes("total extractions"))
      );
      if (breakdown) {
        const totalIdx = breakdown.headers.findIndex((h) =>
          h.toLowerCase().includes("total extractions")
        );
        const nameIdx = breakdown.headers.findIndex((h) =>
          h.toLowerCase().includes("field")
        );
        const targetMatch = q.match(/(\d+)\s+total\s+extraction/i);
        const target = targetMatch ? Number(targetMatch[1]) : undefined;
        if (Number.isFinite(target ?? NaN) && totalIdx >= 0 && nameIdx >= 0) {
          const matches = breakdown.rows.filter((r) => {
            const n = Number(String(r[totalIdx] || "").replace(/,/g, ""));
            return Number.isFinite(n) && n === target;
          });
          if (matches.length === 0) {
            return `There are **0** fields with exactly **${target}** total extractions on this page.`;
          }
          return `There are **${matches.length}** field(s) with exactly **${target}** total extractions:\n${matches
            .slice(0, 20)
            .map((r) => `- **${r[nameIdx]}**`)
            .join("\n")}`;
        }
      }
    }

    if (q.includes("what does") || q.includes("show") || q.includes("analytics data")) {
      const a = ctx.analytics;
      if (a) {
        return `**Analytics Overview:**\n- **${a.totalDocs}** documents processed\n- Average AI confidence: **${a.avgConfidence}**\n- Correction rate: **${a.correctionRate}**\n- Total fields extracted: **${a.fieldsExtracted}**\n\nUse the tabs below to view **Field Accuracy** (which fields the AI gets right), **Corrections** (most-corrected fields), and **Confidence** (per-field confidence levels).`;
      }
      return "The analytics page shows extraction performance metrics. The stat cards at the top give a quick overview, and the chart tabs below provide detailed breakdowns by field.";
    }

    if (q.includes("accuracy") || q.includes("lowest")) {
      return "Check the **Field Accuracy** tab chart — fields shown in **red** have accuracy below 70% and are frequently corrected. Fields in **green** (90%+) rarely need correction.\n\nThe **Field Breakdown** table at the bottom shows exact numbers for each field.";
    }

    if (q.includes("correction rate")) {
      return "**Correction rate** is the percentage of documents where at least one field was manually corrected after AI extraction. A lower rate means the AI is performing well.\n\nA high correction rate for specific fields suggests the extraction prompt may need tuning for those fields.";
    }

    if (q.includes("improve")) {
      return "To improve extraction quality:\n1. Review the **Top Corrected Fields** to identify weak spots\n2. Upload more diverse sample documents to test edge cases\n3. Check if low-confidence fields have consistent patterns\n4. Consider adjusting the extraction prompt for problematic fields\n\nOver time, tracking corrections helps identify systematic issues.";
    }
  }

  // === UPLOAD PAGE ===
  if (ctx.page === "upload") {
    if (q.includes("file type") || q.includes("format") || q.includes("what can")) {
      return "Supported file types:\n- **PDF** (most common for freight docs)\n- **PNG** and **JPEG** images\n- Maximum file size: **20MB**\n\nThe AI works best with clear, high-resolution documents. Scanned PDFs at 200+ DPI give the best results.";
    }

    if (q.includes("after upload") || q.includes("what happens") || q.includes("process")) {
      return "After you upload a document:\n1. **Upload** — File is saved and validated\n2. **PDF Processing** — Converted to high-res images\n3. **AI Extraction** — Claude analyzes each page and extracts 30+ fields\n4. **Storage** — Results saved to database\n\nYou'll be automatically redirected to the document detail page where you can review and correct the extracted data.";
    }

    if (q.includes("duplicate")) {
      return "**Duplicate Detection** automatically checks if a file with the same content has already been uploaded using SHA-256 hash comparison. If a duplicate is found, you'll see an alert with the existing document and can choose to view it or upload anyway.";
    }
  }

  // === COMPARE PAGE ===
  if (ctx.page === "compare") {
    if (
      q.includes("what are we comparing") ||
      (q.includes("what") && q.includes("comparing"))
    ) {
      const d1 = ctx.compare?.doc1;
      const d2 = ctx.compare?.doc2;
      if (d1?.id && d2?.id) {
        return `You're comparing:\n- **Document 1:** ${d1.name}\n- **Document 2:** ${d2.name}\n\nThese are compared field-by-field based on the extracted data shown in the **Field Comparison** table.`;
      }
      return "Select two documents in the **Document 1** and **Document 2** dropdowns to start a comparison.";
    }

    if (
      (q.includes("how many") || q.includes("number of")) &&
      (q.includes("differ") || q.includes("different") || q.includes("mismatch"))
    ) {
      const n = ctx.compare?.mismatchedFields;
      const total = ctx.compare?.totalFields;
      const pct = ctx.compare?.matchPercentage;
      if (typeof n === "number") {
        const extra =
          typeof total === "number" && typeof pct === "number"
            ? `\n\nSummary: **${n}** mismatched, **${ctx.compare?.matchingFields ?? "?"}** matching out of **${total}** fields (**${pct.toFixed(1)}%** match).`
            : "";
        return `**${n}** field(s) differ between the two documents.${extra}`;
      }
      return "Run a comparison (click **Compare Documents**) and I can tell you exactly how many fields differ.";
    }

    if (q.includes("how") || q.includes("work")) {
      return "To compare documents:\n1. Select two documents from the dropdowns\n2. Click **Compare Documents**\n3. View the side-by-side comparison\n\nThe comparison checks 27 fields including shipper, consignee, values, weights, and trade terms. **Match percentage** shows overall similarity, and mismatched fields are highlighted in red.";
    }

    if (q.includes("can't select") || q.includes("empty") || q.includes("no document")) {
      return "Documents must have **extracted** data to be compared. Only documents with status 'Extracted', 'Reviewed', or 'Approved' appear in the selectors.\n\nIf you don't see any documents, make sure you have at least two processed documents. Upload and process documents first from the Upload page.";
    }
  }

  // === GENERAL KNOWLEDGE ===
  if (q.includes("navigation") || q.includes("navigate") || q.includes("pages") || q.includes("where")) {
    return "**App Navigation:**\n- **Dashboard** — View and manage all documents, search, filter, export\n- **Upload** — Drag & drop documents for AI extraction\n- **Analytics** — Extraction accuracy metrics and charts\n- **Compare** — Side-by-side document comparison\n\nClick any document in the dashboard to view its full extracted data, line items, and correction history.";
  }

  if (q.includes("export") || q.includes("csv")) {
    return "**Export options:**\n- **Dashboard** → Export CSV button exports all documents with header fields\n- **Document Detail** → Export CSV exports line items for that document\n\nThe CSV includes all extracted fields in a structured format suitable for importing into ERP or customs systems.";
  }

  if (q.includes("confidence")) {
    return "**Confidence scores** (0-100%) indicate AI certainty:\n- **Green (90%+)** — High confidence, likely accurate\n- **Amber (70-89%)** — Medium, should be verified\n- **Red (<70%)** — Low, needs manual review\n\nLow-confidence fields are highlighted with amber borders in the extraction form. Always review these before approving.";
  }

  if (q.includes("correction") || q.includes("correct") || q.includes("edit")) {
    return "**Correction Workflow:**\n1. Open a document from the Dashboard\n2. Edit any field in the **Extracted Data** tab\n3. Modified fields turn blue to show changes\n4. Click **Save Changes** to record corrections\n\nAll corrections create an immutable audit trail showing the original AI value vs your correction, with timestamp and user name.";
  }

  if (q.includes("extraction") || q.includes("extract") || q.includes("ai")) {
    return "**AI Extraction Pipeline:**\n1. Document converted to high-res images (200 DPI)\n2. Claude's vision API analyzes each page\n3. 30+ structured fields extracted with confidence scores\n4. Results stored relationally in PostgreSQL\n\nExtracted fields include parties (shipper/consignee), shipping details (vessel, ports), trade terms, values, weights, and individual line items.";
  }

  // Fallback — provide context-aware help
  const pageHints: Record<string, string> = {
    dashboard: "You're on the **Dashboard**. I can tell you about your documents, their status, confidence scores, or help you navigate the app.",
    upload: "You're on the **Upload** page. I can explain file formats, the extraction process, or duplicate detection.",
    analytics: "You're on the **Analytics** page. I can explain the metrics, charts, or help you understand extraction performance.",
    compare: "You're on the **Compare** page. I can explain how comparison works or help troubleshoot issues.",
    "document-detail": "You're viewing a **document**. I can summarize it, explain confidence scores, corrections, or help you review the data.",
  };

  return `${pageHints[ctx.page] || "I'm your Freight DIH assistant."}\n\nTry asking me:\n- About the data on your current page\n- How features work (extraction, corrections, comparison)\n- Navigation help\n- What confidence scores mean\n- How to export data`;
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => <p className="mt-2 text-sm font-semibold">{children}</p>,
        h2: ({ children }) => <p className="mt-2 text-sm font-semibold">{children}</p>,
        h3: ({ children }) => <p className="mt-2 text-sm font-semibold">{children}</p>,
        ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[0.85em]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="mt-2 overflow-x-auto rounded-lg bg-background/60 p-2 text-xs leading-relaxed">
            {children}
          </pre>
        ),
        hr: () => <hr className="my-3 border-border" />,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function shouldAnswerLocally(question: string, ctx: PageContext): boolean {
  const q = question.toLowerCase();

  if (ctx.page === "compare") {
    const hasIds = !!(ctx.compare?.doc1?.id && ctx.compare?.doc2?.id);
    const hasResult = typeof ctx.compare?.mismatchedFields === "number";
    const isCompareIntent =
      q.includes("what are we comparing") ||
      (q.includes("what") && q.includes("comparing")) ||
      ((q.includes("how many") || q.includes("number of")) &&
        (q.includes("differ") || q.includes("different") || q.includes("mismatch")));

    return isCompareIntent && (hasIds || hasResult);
  }

  if (ctx.page === "analytics") {
    const hasBreakdown = (ctx.analyticsFieldBreakdown?.length || 0) > 0;
    const isUiCountQuestion =
      q.includes("on this page") &&
      (q.includes("total extraction") || q.includes("extraction")) &&
      (q.includes("how many") || q.includes("number of") || q.includes("mbl"));
    // If we have the structured data OR at least one table with Total Extractions, answer locally.
    const hasTableFallback = (ctx.ui?.tables || []).some((t) =>
      t.headers.some((h) => h.toLowerCase().includes("total extractions"))
    );
    return (hasBreakdown || hasTableFallback) && isUiCountQuestion;
  }

  return false;
}

export function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const dragBoundsRef = useRef<HTMLDivElement>(null);
  const collapsedRef = useRef<HTMLDivElement>(null);

  // Collapsed button draggable position (persisted)
  const collapsedX = useMotionValue(0);
  const collapsedY = useMotionValue(0);
  const didDragRef = useRef(false);
  const lastDragAtRef = useRef(0);

  const clampCollapsedIntoViewport = useCallback(() => {
    const el = collapsedRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    let dy = 0;

    if (rect.left < pad) dx = pad - rect.left;
    if (rect.right > window.innerWidth - pad)
      dx = window.innerWidth - pad - rect.right;
    if (rect.top < pad) dy = pad - rect.top;
    if (rect.bottom > window.innerHeight - pad)
      dy = window.innerHeight - pad - rect.bottom;

    if (dx || dy) {
      collapsedX.set(collapsedX.get() + dx);
      collapsedY.set(collapsedY.get() + dy);
    }
  }, [collapsedX, collapsedY]);

  const suggestions =
    SUGGESTED_QUESTIONS[pathname] ||
    (pathname.startsWith("/documents/") ? DOC_SUGGESTIONS : SUGGESTED_QUESTIONS["/"]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("copilot-collapsed-pos");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed.x === "number") collapsedX.set(parsed.x);
      if (typeof parsed.y === "number") collapsedY.set(parsed.y);
    } catch {
      // ignore
    }

    // After restoring saved position, ensure it's fully visible.
    requestAnimationFrame(() => clampCollapsedIntoViewport());
  }, [collapsedX, collapsedY]);

  const persistCollapsedPos = useCallback(() => {
    try {
      localStorage.setItem(
        "copilot-collapsed-pos",
        JSON.stringify({ x: collapsedX.get(), y: collapsedY.get() })
      );
    } catch {
      // ignore
    }
  }, [collapsedX, collapsedY]);

  useEffect(() => {
    const onResize = () => clampCollapsedIntoViewport();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampCollapsedIntoViewport]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = useCallback(
    async (text?: string) => {
      const question = text || input.trim();
      if (!question) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);
      setStreamingMessageId(null);

      // Read DOM context and call backend copilot API
      const ctx = readPageContext(pathname);
      const localAnswer = generateContextAwareResponse(question, ctx);

      // If we already have the answer from DOM context (esp. compare page),
      // respond immediately instead of waiting on the backend.
      if (shouldAnswerLocally(question, ctx)) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: localAnswer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
        return;
      }

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const orgId =
        process.env.NEXT_PUBLIC_ORG_ID || "00000000-0000-0000-0000-000000000001";

      try {
        // Create a placeholder assistant message that we can stream into.
        const placeholderId = (Date.now() + 1).toString();
        setStreamingMessageId(placeholderId);
        setMessages((prev) => [
          ...prev,
          {
            id: placeholderId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);

        const res = await fetch(`${apiBase}/copilot/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-Id": orgId,
          },
          body: JSON.stringify({
            question,
            page_context: ctx,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Stream unavailable");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        const applyDelta = (delta: string) => {
          accumulated += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId ? { ...m, content: accumulated } : m
            )
          );
        };

        const finish = () => {
          setStreamingMessageId(null);
          setIsTyping(false);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE frames separated by blank line
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const raw = line.slice(5).trim();
              if (!raw) continue;
              try {
                const evt = JSON.parse(raw) as any;
                if (evt?.type === "delta" && typeof evt.text === "string") {
                  applyDelta(evt.text);
                } else if (evt?.type === "error" && typeof evt.message === "string") {
                  // Replace streamed content with a friendly error
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === placeholderId ? { ...m, content: evt.message } : m
                    )
                  );
                  finish();
                  return;
                } else if (evt?.type === "done") {
                  finish();
                  return;
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }

        finish();
        return;

      } catch {
        // Fallback to non-streaming endpoint if stream fails
        try {
          const res = await fetch(`${apiBase}/copilot/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Org-Id": orgId,
            },
            body: JSON.stringify({
              question,
              page_context: ctx,
            }),
          });

          let answer: string;
          if (res.ok) {
            const data = await res.json();
            answer = data.answer;
          } else {
            answer = generateContextAwareResponse(question, ctx);
          }

          const lower = answer.toLowerCase();
          const looksUnaware =
            lower.includes("i don't have") ||
            lower.includes("i do not have") ||
            lower.includes("don't have visibility") ||
            lower.includes("need the document ids") ||
            (lower.includes("share") && lower.includes("document"));
          if (looksUnaware) answer = localAnswer;

          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: answer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } catch {
          const answer = generateContextAwareResponse(question, ctx);
          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: answer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } finally {
        setIsTyping(false);
        setStreamingMessageId(null);
      }
    },
    [input, pathname]
  );

  const panelWidth = isExpanded ? 480 : 380;
  const panelHeight = isExpanded ? 600 : 500;

  return (
    <>
      {/* Drag constraints for the collapsed button (doesn't block clicks) */}
      <div ref={dragBoundsRef} className="fixed inset-0 z-40 pointer-events-none" />

      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            ref={collapsedRef}
            data-tour="copilot"
            className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
            style={{ x: collapsedX, y: collapsedY }}
            drag
            dragConstraints={dragBoundsRef}
            dragElastic={0.12}
            dragMomentum={false}
            onDragStart={() => {
              didDragRef.current = false;
              // Treat any drag gesture as "no open" even if tiny.
              lastDragAtRef.current = Date.now();
            }}
            onDrag={(_, info) => {
              if (Math.abs(info.offset.x) + Math.abs(info.offset.y) > 6) {
                didDragRef.current = true;
              }
            }}
            onDragEnd={() => {
              didDragRef.current = false;
              clampCollapsedIntoViewport();
              persistCollapsedPos();
            }}
          >
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  onClick={() => {
                    if (Date.now() - lastDragAtRef.current < 250) return;
                    setIsOpen(true);
                  }}
                  size="lg"
                  className="h-14 w-14 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow cursor-pointer"
                >
                  <Sparkles className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {`Ask ${COPILOT_NAME} — get help with your freight documents`}
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl"
            style={{
              width: `min(${panelWidth}px, calc(100vw - 40px))`,
              height: `min(${panelHeight}px, calc(100vh - 40px))`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{`Ask ${COPILOT_NAME}`}</h3>
                  <p className="text-xs text-muted-foreground">
                    Freight DIH Assistant
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsOpen(false);
                    setMessages([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-medium">
                      How can I help?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      I can see your current page and help with anything
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Suggested
                    </p>
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="w-full rounded-lg border p-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm overflow-hidden ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className={`break-words [overflow-wrap:anywhere] ${msg.role === "user" ? "whitespace-pre-wrap" : ""}`}>
                          {msg.role === "assistant" ? (
                            <div className="relative">
                              <MarkdownMessage content={msg.content} />
                              {streamingMessageId === msg.id && (
                                <span className="ml-0.5 inline-block translate-y-[1px] animate-pulse text-muted-foreground">
                                  ▍
                                </span>
                              )}
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && !streamingMessageId && (
                    <div className="flex gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-2">
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about this page..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isTyping}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
