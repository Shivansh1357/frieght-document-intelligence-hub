"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, ArrowRight, Sparkles } from "lucide-react";
import type { AvatarStyle } from "@/lib/user-store";

interface WelcomeDialogProps {
  open: boolean;
  onComplete: (name: string, avatarStyle: AvatarStyle) => void;
}

const AVATAR_STYLES: Array<{ id: AvatarStyle; label: string; desc: string }> = [
  { id: "notionists", label: "Classic", desc: "Clean and professional" },
  { id: "adventurer", label: "Illustrated", desc: "Bold and playful" },
  { id: "avataaars", label: "Avatar", desc: "Cartoon-style profile" },
];

function diceBearUrl(style: AvatarStyle, seed: string, size = 96) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

function AnimatedAvatarPreview({
  style,
  seed,
}: {
  style: AvatarStyle;
  seed: string;
}) {
  const nextSrc = useMemo(() => diceBearUrl(style, seed, 96), [style, seed]);
  const [displaySrc, setDisplaySrc] = useState(nextSrc);

  useEffect(() => {
    if (nextSrc === displaySrc) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      setDisplaySrc(nextSrc);
    };
    img.onerror = () => {
      if (!alive) return;
      setDisplaySrc(nextSrc);
    };
    img.src = nextSrc;
    return () => {
      alive = false;
    };
  }, [nextSrc, displaySrc]);

  return (
    <div className="relative size-12 overflow-hidden rounded-full border border-border/60 bg-muted/30 shadow-sm">
      <AnimatePresence initial={false}>
        <motion.img
          key={displaySrc}
          src={displaySrc}
          alt="Avatar preview"
          className="absolute inset-0 size-full object-cover"
          initial={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        />
      </AnimatePresence>
    </div>
  );
}

export function WelcomeDialog({ open, onComplete }: WelcomeDialogProps) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("notionists");

  const handleSubmit = () => {
    const finalName = name.trim() || "Admin User";
    onComplete(finalName, avatarStyle);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <DialogHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Ship className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-2xl">
                  Welcome to Freight DIH
                </DialogTitle>
                <DialogDescription className="text-base">
                  AI-powered freight document intelligence. Extract structured
                  data from invoices, packing lists, and bills of lading in
                  seconds.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {[
                  {
                    title: "Upload Documents",
                    desc: "Drag & drop PDFs or images of freight documents",
                  },
                  {
                    title: "AI Extraction",
                    desc: "Claude AI extracts 30+ fields with confidence scores",
                  },
                  {
                    title: "Review & Approve",
                    desc: "Verify data, make corrections, and approve for export",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => setStep(1)} className="w-full" size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <DialogHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <DialogTitle className="text-2xl">
                  Set Up Your Profile
                </DialogTitle>
                <DialogDescription>
                  Your name will appear in the audit trail when you review and
                  correct extracted data.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-3 justify-center">
                <AnimatedAvatarPreview
                  style={avatarStyle}
                  seed={name.trim() || "Admin User"}
                />
                <div className="text-left">
                  <p className="text-sm font-medium">Avatar style</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a look — you can change it later.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {AVATAR_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAvatarStyle(s.id)}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      avatarStyle === s.id
                        ? "border-primary/40 bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-semibold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                      {s.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-name">Your Name</Label>
                <Input
                  id="user-name"
                  placeholder="e.g. John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  You can change this later in the profile menu. Defaults to
                  &ldquo;Admin User&rdquo; if left blank.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1" size="lg">
                  Start Exploring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
