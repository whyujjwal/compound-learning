"use client";

/**
 * Socratic prompts shown when the learner marks Again — guides reflection
 * instead of a bare wrong-mark.
 */

export function ExplainOnMiss({
  materialTitle,
  onContinue,
}: {
  materialTitle: string;
  onContinue: () => void;
}) {
  const prompts = [
    `What part of "${materialTitle}" felt unclear before you checked?`,
    "What would you try differently on the next attempt — one concrete step?",
    "Can you state the core idea in one sentence without looking at the answer?",
  ];

  return (
    <section
      role="dialog"
      aria-label="Reflect on this miss"
      style={{
        width: "100%",
        maxWidth: 680,
        margin: "16px auto 0",
        padding: 16,
        borderRadius: 6,
        border: "1px solid var(--hairline)",
        background: "color-mix(in srgb, var(--bad) 6%, var(--panel))",
      }}
    >
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
        Before moving on — quick reflection
      </p>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18, color: "var(--fg)", fontSize: 13, lineHeight: 1.5 }}>
        {prompts.map((q) => (
          <li key={q} style={{ marginBottom: 6 }}>
            {q}
          </li>
        ))}
      </ul>
      <button type="button" className="v2-btn primary" onClick={onContinue}>
        Continue
      </button>
    </section>
  );
}
