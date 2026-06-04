import { forwardRef, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** "flat" = hairline border only (default). "raised" = shadow for floating feel. */
  variant?: "flat" | "raised";
  padding?: string | number;
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card(
    {
      variant = "flat",
      padding = "16px",
      hover = false,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...rest
    },
    ref
  ) {
    const base: React.CSSProperties = {
      background: "var(--panel)",
      border: "1px solid var(--hairline)",
      borderRadius: 6,
      padding,
      boxShadow: variant === "raised" ? "var(--shadow-sm)" : "none",
      transition: "box-shadow 150ms, background 100ms",
      ...style,
    };

    return (
      <div
        ref={ref}
        style={base}
        onMouseEnter={(e) => {
          if (hover) {
            (e.currentTarget as HTMLDivElement).style.background = "var(--overlay-hover)";
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (hover) {
            (e.currentTarget as HTMLDivElement).style.background = "var(--panel)";
          }
          onMouseLeave?.(e);
        }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
