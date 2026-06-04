"use client";

import { useEffect, type ReactNode } from "react";

type DrawerSide = "right" | "left" | "bottom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: string;
  children: ReactNode;
  /** Width (for right/left drawers) or height (for bottom), default 400px */
  size?: number | string;
}

const sideStyles: Record<DrawerSide, React.CSSProperties> = {
  right: {
    top: 0,
    right: 0,
    bottom: 0,
    width: "var(--drawer-size, 400px)",
    borderLeft: "1px solid var(--hairline)",
    borderRadius: "8px 0 0 8px",
  },
  left: {
    top: 0,
    left: 0,
    bottom: 0,
    width: "var(--drawer-size, 400px)",
    borderRight: "1px solid var(--hairline)",
    borderRadius: "0 8px 8px 0",
  },
  bottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: "var(--drawer-size, 400px)",
    borderTop: "1px solid var(--hairline)",
    borderRadius: "8px 8px 0 0",
  },
};

export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
  size = 400,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700 }}>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--scrim)",
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        style={{
          position: "absolute",
          background: "var(--canvas)",
          boxShadow: "var(--shadow-float)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          // Size as CSS var for side styles
          ["--drawer-size" as string]: typeof size === "number" ? `${size}px` : size,
          ...sideStyles[side],
        }}
      >
        {title && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid var(--hairline)",
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
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
        )}
        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
