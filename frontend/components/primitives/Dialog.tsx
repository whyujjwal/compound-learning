"use client";

import { useEffect, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Width of dialog, default 480px */
  width?: number | string;
  /** Whether clicking the backdrop closes the dialog */
  closeOnBackdrop?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  width = 480,
  closeOnBackdrop = true,
}: DialogProps) {
  // Trap Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-desc" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--scrim)",
          cursor: closeOnBackdrop ? "pointer" : "default",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: typeof width === "number" ? width : width,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100dvh - 64px)",
          background: "var(--canvas)",
          border: "1px solid var(--hairline)",
          borderRadius: 8,
          boxShadow: "var(--shadow-float)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "dialog-in 120ms ease",
        }}
      >
        {(title || description) && (
          <div style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--hairline)",
          }}>
            {title && (
              <h2 id="dialog-title" style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text)",
                lineHeight: 1.3,
              }}>
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-desc" style={{
                marginTop: 4,
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}>
                {description}
              </p>
            )}
          </div>
        )}

        <div style={{ overflow: "auto", flex: 1 }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes dialog-in {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function DialogBody({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: "16px 24px", ...style }}>
      {children}
    </div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "12px 24px",
      borderTop: "1px solid var(--hairline)",
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      background: "var(--panel)",
    }}>
      {children}
    </div>
  );
}
