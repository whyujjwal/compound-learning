import type { HTMLAttributes, ReactNode } from "react";

export type BadgeColor = "default" | "accent" | "success" | "warn" | "error" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  children: ReactNode;
}

const colorStyles: Record<BadgeColor, React.CSSProperties> = {
  default: {
    background: "var(--overlay-hover)",
    color: "var(--text)",
    border: "1px solid var(--hairline)",
  },
  accent: {
    background: "var(--accent-soft)",
    color: "var(--accent)",
    border: "1px solid transparent",
  },
  success: {
    background: "rgba(15, 123, 108, 0.1)",
    color: "var(--ok)",
    border: "1px solid transparent",
  },
  warn: {
    background: "rgba(201, 122, 0, 0.1)",
    color: "var(--warn)",
    border: "1px solid transparent",
  },
  error: {
    background: "rgba(235, 87, 87, 0.1)",
    color: "var(--bad)",
    border: "1px solid transparent",
  },
  muted: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--hairline)",
  },
};

export function Badge({ color = "default", children, style, ...rest }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 3,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        ...colorStyles[color],
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
