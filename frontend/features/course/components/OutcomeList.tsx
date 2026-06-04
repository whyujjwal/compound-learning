export function OutcomeList({ outcomes, heading }: { outcomes: string[]; heading?: string }) {
  if (!outcomes.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      {heading && (
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 6,
        }}>
          {heading}
        </p>
      )}
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {outcomes.map((o) => (
          <li
            key={o}
            style={{
              fontSize: 13,
              color: "var(--text)",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              lineHeight: 1.5,
            }}
          >
            <span aria-hidden style={{ color: "var(--ok)", flexShrink: 0, marginTop: 1 }}>✓</span>
            {o}
          </li>
        ))}
      </ul>
    </div>
  );
}
