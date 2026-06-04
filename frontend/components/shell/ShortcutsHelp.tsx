"use client";

import { Dialog, DialogBody } from "@/components/primitives";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ─── Kbd helper ─────────────────────────────────────────── */
function Kbd({ children }: { children: string }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 5px",
        minWidth: 20,
        height: 20,
        borderRadius: 4,
        fontSize: 11,
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
        fontWeight: 500,
        lineHeight: 1,
        color: "var(--text)",
        background: "var(--overlay-hover)",
        border: "1px solid var(--hairline)",
        boxShadow: "0 1px 0 0 var(--hairline)",
      }}
    >
      {children}
    </kbd>
  );
}

/* ─── Row ─────────────────────────────────────────────────── */
function Row({
  description,
  keys,
}: {
  description: string;
  keys: string[];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid var(--hairline)",
        gap: 16,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </span>
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────── */
function SectionHeading({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--muted)",
        paddingTop: 20,
        paddingBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Keyboard shortcuts"
      width={520}
    >
      <DialogBody style={{ paddingTop: 8, paddingBottom: 20 }}>
        {/* Navigation */}
        <SectionHeading>Navigation</SectionHeading>
        <Row description="Command palette" keys={["⌘", "K"]} />
        <Row description="Go to Home" keys={["G", "H"]} />
        <Row description="Go to Library" keys={["G", "L"]} />
        <Row description="Go to Explore" keys={["G", "E"]} />
        <Row description="Go to Profile" keys={["G", "P"]} />

        {/* Review session */}
        <SectionHeading>Review (session)</SectionHeading>
        <Row description="Reveal answer" keys={["Space"]} />
        <Row description="Grade: Again" keys={["1"]} />
        <Row description="Grade: Hard" keys={["2"]} />
        <Row description="Grade: Good" keys={["3"]} />
        <Row description="Grade: Easy" keys={["4"]} />

        {/* General */}
        <SectionHeading>General</SectionHeading>
        <Row description="Show this help" keys={["?"]} />
        <Row description="Close / dismiss" keys={["Esc"]} />
      </DialogBody>
    </Dialog>
  );
}
