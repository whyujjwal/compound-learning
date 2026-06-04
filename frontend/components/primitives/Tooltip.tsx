"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  placement = "top",
  delay = 500,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const placementStyle: Record<TooltipPlacement, React.CSSProperties> = {
    top:    { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left:   { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
    right:  { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 600,
            background: "var(--text)",
            color: "var(--canvas)",
            fontSize: 12,
            fontWeight: 400,
            padding: "4px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            maxWidth: 200,
            pointerEvents: "none",
            animation: "tooltip-in 100ms ease",
            lineHeight: 1.4,
            ...placementStyle[placement],
          }}
        >
          {content}
          <style>{`
            @keyframes tooltip-in {
              from { opacity: 0; transform: ${placementStyle[placement].transform ?? ""} scale(0.95); }
              to   { opacity: 1; transform: ${placementStyle[placement].transform ?? ""}; }
            }
          `}</style>
        </span>
      )}
    </span>
  );
}
