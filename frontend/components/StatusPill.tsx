"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Status = {
  api: "ok" | "down" | "checking";
  ai: "enabled" | "disabled" | "unknown";
};

export function StatusPill() {
  const [status, setStatus] = useState<Status>({ api: "checking", ai: "unknown" });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const ai = await api.getAIStatus();
        if (cancelled) return;
        setStatus({ api: "ok", ai: ai.enabled ? "enabled" : "disabled" });
      } catch {
        if (cancelled) return;
        setStatus({ api: "down", ai: "unknown" });
      }
    }
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const apiLabel =
    status.api === "ok" ? "API live" : status.api === "down" ? "API down" : "checking";
  const aiLabel =
    status.ai === "enabled" ? "AI on" : status.ai === "disabled" ? "AI off" : "—";

  return (
    <div className="status-pill" title={`Backend: ${apiLabel} · Coach: ${aiLabel}`}>
      <span className={`status-dot status-${status.api}`} />
      <span className="status-text">{apiLabel}</span>
      <span className="status-divider">·</span>
      <span className={`status-dot status-${status.ai === "enabled" ? "ok" : "down"}`} />
      <span className="status-text">{aiLabel}</span>
    </div>
  );
}
