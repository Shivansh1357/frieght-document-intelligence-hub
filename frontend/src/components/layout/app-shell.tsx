"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WelcomeDialog } from "@/components/onboarding/welcome-dialog";
import { AppTour } from "@/components/onboarding/app-tour";
import { CopilotWidget } from "@/components/ai-copilot/copilot-widget";
import { BackgroundPattern } from "@/components/layout/background-pattern";
import { useUserProfile } from "@/hooks/use-user-profile";
import type { AvatarStyle } from "@/lib/user-store";
import { motion } from "framer-motion";

const SIDEBAR_KEY = "freight-dih-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isLoaded, isFirstVisit, setName, update } =
    useUserProfile();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMdUp, setIsMdUp] = useState(false);
  const [expandedSidebarWidth, setExpandedSidebarWidth] = useState(256);

  // Restore sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  // Responsive breakpoints (md and up show sidebar)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setIsMdUp(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Responsive expanded sidebar width (looks better on large screens)
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 1920) return 320;
      if (w >= 1536) return 288;
      if (w >= 1280) return 272;
      return 256;
    };
    const update = () => setExpandedSidebarWidth(compute());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isLoaded && isFirstVisit) {
      setShowWelcome(true);
    }
  }, [isLoaded, isFirstVisit]);

  const handleWelcomeComplete = (name: string, avatarStyle: AvatarStyle) => {
    setName(name, avatarStyle);
    setShowWelcome(false);
    // Start tour after a short delay
    setTimeout(() => setShowTour(true), 500);
  };

  const handleTourComplete = () => {
    setShowTour(false);
    update({ isFirstVisit: false });
  };

  return (
    <TooltipProvider delay={300}>
      <div className="relative flex min-h-screen">
        <BackgroundPattern />
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          expandedWidth={expandedSidebarWidth}
        />
        <motion.div
          initial={false}
          animate={{
            paddingLeft: isMdUp ? (sidebarCollapsed ? 64 : expandedSidebarWidth) : 0,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex flex-1 flex-col min-w-0"
        >
          <Header />
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px]">
              {children}
            </div>
          </main>
        </motion.div>
      </div>

      {/* Onboarding */}
      <WelcomeDialog open={showWelcome} onComplete={handleWelcomeComplete} />
      <AppTour active={showTour} onComplete={handleTourComplete} />

      {/* AI Copilot */}
      <CopilotWidget />
    </TooltipProvider>
  );
}
