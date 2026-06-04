"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/primitives";
import { useSyllabiList, useImportExampleCurriculum } from "@/lib/hooks";

// localStorage key that tracks whether the user has dismissed the onboarding
const ONBOARDED_KEY = "compound:onboarded";

function useIsOnboarded(): {
  shouldShow: boolean;
  dismiss: () => void;
} {
  // Avoid SSR mismatch: start as "not determined" (null), resolve in effect
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(ONBOARDED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  // While we haven't read localStorage yet, don't show anything
  if (dismissed === null) return { shouldShow: false, dismiss };

  return { shouldShow: !dismissed, dismiss };
}

/* ── Step card ──────────────────────────────────────────────────── */
interface StepCardProps {
  step: number;
  title: string;
  description: string;
  action: React.ReactNode;
  primary?: boolean;
}

function StepCard({ step, title, description, action, primary }: StepCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px 20px 20px 20px",
        borderRadius: 6,
        border: `1px solid ${primary ? "rgba(35,131,226,0.25)" : "var(--hairline)"}`,
        background: primary ? "rgba(35,131,226,0.04)" : "var(--panel)",
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Step badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: primary ? "var(--accent)" : "var(--overlay-hover)",
            color: primary ? "#fff" : "var(--muted)",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {step}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          {title}
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "var(--muted)",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description}
      </p>

      <div style={{ marginTop: "auto" }}>{action}</div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function OnboardingWelcome() {
  const router = useRouter();
  const toast = useToast();
  const { shouldShow, dismiss } = useIsOnboarded();

  const { data: syllabi, isLoading: syllabiLoading } = useSyllabiList();
  const importMutation = useImportExampleCurriculum();

  // Once any syllabus exists, the onboarding should not show regardless of flag
  const hasSyllabi = !syllabiLoading && syllabi && syllabi.length > 0;

  if (!shouldShow || hasSyllabi) return null;

  const handleImportExamples = async () => {
    try {
      await importMutation.mutateAsync();
      toast.push({
        kind: "success",
        title: "Example syllabi imported",
        body: "Your library is ready — let's start learning.",
      });
      // onboarding will hide automatically since syllabi is now non-empty
    } catch {
      toast.push({
        kind: "error",
        title: "Import failed",
        body: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid var(--hairline)",
        background: "var(--panel)",
        padding: "32px 28px 28px",
        marginBottom: 32,
      }}
    >
      {/* Headline */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          Welcome to Compound
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          Spaced-repetition learning that schedules itself — so you remember
          more while studying less.
        </p>
      </div>

      {/* Step cards */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {/* Step 1 — primary */}
        <StepCard
          step={1}
          title="Generate a roadmap"
          description="Tell the AI what you want to learn. It builds a structured syllabus with a daily review schedule."
          primary
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/library/new")}
            >
              Generate a roadmap
            </Button>
          }
        />

        {/* Step 2 */}
        <StepCard
          step={2}
          title="Import example syllabi"
          description="Try pre-built tracks across programming, science, and more — ready to study in seconds."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportExamples}
              disabled={importMutation.isPending}
              loading={importMutation.isPending}
            >
              {importMutation.isPending ? "Importing…" : "Import examples"}
            </Button>
          }
        />

        {/* Step 3 */}
        <StepCard
          step={3}
          title="Browse community tracks"
          description="Discover syllabi created by other learners and adopt them into your own library."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/explore")}
            >
              Browse community
            </Button>
          }
        />
      </div>

      {/* Skip link */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            padding: "4px 0",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--muted)",
            letterSpacing: "0.01em",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
