import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: 12,
        ...style,
      }}
    >
      {icon && (
        <div style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 24,
          marginBottom: 4,
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontSize: 15,
        fontWeight: 600,
        color: "var(--text)",
        lineHeight: 1.3,
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 14,
          color: "var(--muted)",
          lineHeight: 1.6,
          maxWidth: 380,
        }}>
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 8 }}>
          {action}
        </div>
      )}
    </div>
  );
}
