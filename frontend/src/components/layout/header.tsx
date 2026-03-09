"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": { title: "Documents", description: "Manage and review freight documents." },
  "/upload": { title: "Upload", description: "Upload freight documents for AI extraction." },
  "/analytics": { title: "Analytics", description: "Monitor accuracy, confidence, and correction trends." },
  "/compare": { title: "Compare", description: "Compare two freight documents side-by-side to spot discrepancies." },
};

export function Header() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = useMemo(() => {
    if (!mounted) return true; // app defaults to dark; prevents initial mismatch
    return resolvedTheme === "dark";
  }, [mounted, resolvedTheme]);

  const isDocDetail = pathname.startsWith("/documents/");
  const meta = isDocDetail
    ? { title: "Document Detail", description: "Review extracted data and corrections." }
    : PAGE_META[pathname] || { title: "Page", description: "" };

  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="relative flex h-14 items-center gap-4 px-6">
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-5 w-1 rounded-full bg-gradient-to-b from-primary/60 to-primary/10" />
            <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
              {meta.title}
            </h1>
          </div>
          {meta.description ? (
            <p className="hidden sm:block pl-4 text-xs text-muted-foreground/80 truncate">
              {meta.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? "Switch to light mode" : "Switch to dark mode"}
          </TooltipContent>
        </Tooltip>
      </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </header>
  );
}
