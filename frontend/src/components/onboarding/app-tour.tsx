"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Upload,
  LayoutDashboard,
  BarChart3,
  GitCompare,
  CheckCircle,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type TourPosition = "bottom" | "right" | "left" | "top";

type TourStep = {
  pathname: string;
  target: string;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
  position: TourPosition;
};

const TOUR_STEPS: TourStep[] = [
  {
    pathname: "/",
    target: '[data-tour="dashboard-filters"]',
    title: "Dashboard filters",
    description:
      "Search and filter by status, doc type, country, and date range. This makes it easy to find the right shipment fast.",
    icon: LayoutDashboard,
    position: "bottom",
  },
  {
    pathname: "/",
    target: '[data-tour="dashboard-table"]',
    title: "Document list",
    description:
      "This table is your work queue. Open any document to review extracted data, make corrections, and approve.",
    icon: LayoutDashboard,
    position: "bottom",
  },
  {
    pathname: "/",
    target: '[data-tour="copilot"]',
    title: "Ask Sofia (Copilot)",
    description:
      "Copilot is UI-state aware: it can answer questions about what you're currently seeing (filters, tabs, comparison results, analytics breakdown). Drag it when collapsed; it stays fixed when opened.",
    icon: LayoutDashboard,
    position: "left",
  },
  {
    pathname: "/upload",
    target: '[data-tour="upload-dropzone"]',
    title: "Bulk upload",
    description:
      "Drop one or more PDFs/images. Files are processed sequentially with per-file status, duplicate detection, and progress.",
    icon: Upload,
    position: "bottom",
  },
  {
    pathname: "/analytics",
    target: '[data-tour="analytics-tabs"]',
    title: "Analytics tabs",
    description:
      "Use these tabs to understand quality: accuracy (what the AI gets right), corrections (what humans fix), and confidence (how sure the AI is).",
    icon: BarChart3,
    position: "bottom",
  },
  {
    pathname: "/analytics",
    target: '[data-tour="analytics-breakdown"]',
    title: "Field breakdown",
    description:
      "This table is the source of truth for per-field totals, confidence, corrections, and accuracy—use it to prioritize prompt improvements.",
    icon: BarChart3,
    position: "bottom",
  },
  {
    pathname: "/compare",
    target: '[data-tour="compare-select"]',
    title: "Compare documents",
    description:
      "Pick two processed documents to compare. Great for invoice vs packing list cross-checks or re-extraction validation.",
    icon: GitCompare,
    position: "bottom",
  },
  {
    pathname: "/compare",
    target: '[data-tour="compare-action"]',
    title: "Run comparison",
    description:
      "Click Compare to get match rate + mismatched fields. Differences are highlighted and fully readable with tooltips.",
    icon: GitCompare,
    position: "bottom",
  },
];

interface AppTourProps {
  active: boolean;
  onComplete: () => void;
}

export function AppTour({ active, onComplete }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const updatePosition = useCallback((step: TourStep) => {
    const target = document.querySelector(step.target) as HTMLElement | null;
    if (!target) return false;

    const rect = target.getBoundingClientRect();
    // Bring into view if needed
    const pad = 16;
    const TOOLTIP_W = 320; // w-80
    const TOOLTIP_H = 260; // conservative (title + desc + footer)
    const isOffscreen =
      rect.top < pad ||
      rect.left < pad ||
      rect.bottom > window.innerHeight - pad ||
      rect.right > window.innerWidth - pad;
    if (isOffscreen) {
      try {
        target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      } catch {
        // ignore
      }
    }

    setHighlightRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    const clamp = (p: { top: number; left: number }) => {
      return {
        left: Math.min(Math.max(pad, p.left), window.innerWidth - TOOLTIP_W - pad),
        top: Math.min(Math.max(pad, p.top), window.innerHeight - TOOLTIP_H - pad),
      };
    };

    const overlapsTarget = (p: { top: number; left: number }) => {
      const tLeft = p.left;
      const tTop = p.top;
      const tRight = p.left + TOOLTIP_W;
      const tBottom = p.top + TOOLTIP_H;
      const rLeft = rect.left;
      const rTop = rect.top;
      const rRight = rect.right;
      const rBottom = rect.bottom;
      return !(tRight < rLeft || tLeft > rRight || tBottom < rTop || tTop > rBottom);
    };

    const place = (where: TourPosition) => {
      const p = { top: 0, left: 0 };
      switch (where) {
        case "bottom":
          p.top = rect.bottom + 16;
          p.left = rect.left;
          break;
        case "top":
          p.top = rect.top - 16 - TOOLTIP_H;
          p.left = rect.left;
          break;
        case "right":
          p.top = rect.top - 10;
          p.left = rect.right + 16;
          break;
        case "left":
          p.top = rect.top - 10;
          p.left = rect.left - 16 - TOOLTIP_W;
          break;
      }
      return clamp(p);
    };

    const candidates: TourPosition[] = [
      step.position,
      "top",
      "left",
      "right",
      "bottom",
    ].filter((v, i, a) => a.indexOf(v) === i) as TourPosition[];

    // Choose the first placement that doesn't cover the target.
    let chosen = place(step.position);
    for (const c of candidates) {
      const p = place(c);
      if (!overlapsTarget(p)) {
        chosen = p;
        break;
      }
    }

    setTooltipPosition(chosen);
    return true;
  }, []);

  useEffect(() => {
    if (!active) return;
    const step = TOUR_STEPS[currentStep];

    // Navigate to the step's page first.
    if (pathname !== step.pathname) {
      setHighlightRect(null);
      router.push(step.pathname);
      return;
    }

    let cancelled = false;
    let tries = 0;

    const tick = () => {
      if (cancelled) return;
      const ok = updatePosition(step);
      if (ok) return;
      tries += 1;
      // Retry while the page renders / data loads
      if (tries < 60) {
        setTimeout(tick, 50);
      } else {
        // If target never appears, skip this step.
        setCurrentStep((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
      }
    };

    tick();

    const onResize = () => updatePosition(step);
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, [active, currentStep, pathname, router, updatePosition]);

  const finishTour = useCallback(() => {
    onComplete();
    if (pathname !== "/") {
      router.push("/");
    }
  }, [onComplete, pathname, router]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTour();
    }
  };

  const handleSkip = () => {
    finishTour();
  };

  if (!active) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const enterFrom =
    step.position === "right"
      ? { x: 16, y: 0 }
      : step.position === "left"
        ? { x: -16, y: 0 }
        : step.position === "top"
          ? { x: 0, y: -16 }
          : step.position === "bottom"
        ? { x: 0, y: 16 }
        : { x: 0, y: 0 };

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 z-[60] bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />

      {/* Highlight */}
      {highlightRect && (
        <motion.div
          className="fixed z-[65] pointer-events-none rounded-xl ring-2 ring-primary/70 ring-offset-2 ring-offset-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.98, ...enterFrom }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, ...enterFrom }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed z-[70] w-80 rounded-2xl border bg-popover/90 p-4 shadow-2xl backdrop-blur"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          <button
            onClick={handleSkip}
            className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i === currentStep
                        ? "bg-primary"
                        : i < currentStep
                          ? "bg-primary/40"
                          : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentStep + 1}/{TOUR_STEPS.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="sm:w-auto">
                Skip
              </Button>
              <Button size="sm" onClick={handleNext} className="sm:w-auto">
                {isLast ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Done
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
