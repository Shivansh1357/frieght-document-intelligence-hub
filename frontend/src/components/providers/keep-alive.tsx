"use client";

import { useEffect } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Silently pings the backend health endpoint every 4 minutes to prevent
 * Render free tier from spinning down the server.
 *
 * Render free instances sleep after 15 minutes of inactivity, causing
 * 20–30 second cold starts. This keeps the instance warm during active use.
 */
export function KeepAlive() {
  useEffect(() => {
    // Ping immediately on mount (wakes up the server as soon as the app loads)
    const ping = () => {
      fetch(`${API_BASE}/health`, { method: "GET" }).catch(() => {
        // Silently ignore — this is best-effort only
      });
    };

    ping();

    // Then ping every 4 minutes (Render sleeps after 15 min)
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
