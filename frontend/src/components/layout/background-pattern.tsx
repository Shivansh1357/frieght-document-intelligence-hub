"use client";

export function BackgroundPattern() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Soft vignette wash (reduces harsh empty space) */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-transparent to-background/65 dark:from-background/10 dark:to-background/35" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Animated gradient orbs */}
      <div className="absolute -top-44 -right-44 h-[520px] w-[520px] rounded-full bg-primary/[0.06] blur-3xl animate-float-slow" />
      <div className="absolute -bottom-44 -left-44 h-[440px] w-[440px] rounded-full bg-teal-500/[0.05] blur-3xl animate-float-slow-reverse" />
      <div className="absolute top-[20%] -left-32 h-[360px] w-[360px] rounded-full bg-violet-500/[0.04] blur-3xl animate-float-slow" />
    </div>
  );
}
