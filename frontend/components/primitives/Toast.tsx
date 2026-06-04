"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/* ─── Types ──────────────────────────────────────────────── */
export type ToastKind = "info" | "success" | "warn" | "error";

export interface ToastData {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  durationMs?: number;
}

type ToastContextValue = {
  push: (toast: Omit<ToastData, "id">) => void;
  dismiss: (id: number) => void;
};

/* ─── Context ────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

let _seq = 0;

const kindBorder: Record<ToastKind, string> = {
  info: "var(--info)",
  success: "var(--ok)",
  warn: "var(--warn)",
  error: "var(--bad)",
};

/* ─── Provider ───────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = ++_seq;
      const duration = toast.durationMs ?? 4000;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Single toast ───────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      style={{
        background: "var(--canvas)",
        border: "1px solid var(--hairline)",
        borderLeft: `3px solid ${kindBorder[toast.kind]}`,
        borderRadius: 6,
        boxShadow: "var(--shadow-float)",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        position: "relative",
        pointerEvents: "auto",
        animation: "toast-in 150ms ease",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", paddingRight: 20 }}>
        {toast.title}
      </div>
      {toast.body && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {toast.body}
        </div>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          lineHeight: 1,
          color: "var(--muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderRadius: 3,
          transition: "background 100ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--overlay-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ─── Hook ───────────────────────────────────────────────── */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  // Graceful no-op when used outside provider (SSR, tests)
  if (!ctx) {
    return {
      push: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

// Re-export for legacy compat
export function useAutoDismissOnRouteChange() {
  useEffect(() => {}, []);
}
