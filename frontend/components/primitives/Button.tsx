import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 28, padding: "0 10px", fontSize: 13, borderRadius: 4 },
  md: { height: 34, padding: "0 14px", fontSize: 14, borderRadius: 4 },
  lg: { height: 40, padding: "0 18px", fontSize: 15, borderRadius: 6 },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--accent)",
    color: "#ffffff",
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--overlay-hover)",
    color: "var(--text)",
    border: "1px solid var(--hairline)",
  },
  ghost: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid transparent",
  },
  danger: {
    background: "transparent",
    color: "var(--bad)",
    border: "1px solid var(--bad)",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontWeight: 500,
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.5 : 1,
      transition: "background 100ms, color 100ms, border-color 100ms, opacity 100ms",
      whiteSpace: "nowrap",
      userSelect: "none",
      textDecoration: "none",
      lineHeight: 1,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={baseStyle}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            const el = e.currentTarget;
            if (variant === "primary") {
              el.style.background = "var(--accent-hover)";
            } else if (variant === "secondary") {
              el.style.background = "var(--overlay-active)";
            } else if (variant === "ghost") {
              el.style.background = "var(--overlay-hover)";
              el.style.color = "var(--text)";
            } else if (variant === "danger") {
              el.style.background = "var(--bad)";
              el.style.color = "#ffffff";
            }
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) {
            const el = e.currentTarget;
            const vs = variantStyles[variant];
            el.style.background = (vs.background as string) ?? "transparent";
            el.style.color = (vs.color as string) ?? "var(--text)";
          }
          onMouseLeave?.(e);
        }}
        {...rest}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <circle
        cx="7"
        cy="7"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="16 16"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
