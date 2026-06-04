"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/primitives";
import type { Stats } from "@/lib/api/types";

// ── Streak milestone config ───────────────────────────────────────
const MILESTONES = [7, 14, 30, 50, 100, 365] as const;
const MILESTONE_KEY = "compound:streak-milestone";

function getHighestCelebratedMilestone(): number {
  try {
    return parseInt(localStorage.getItem(MILESTONE_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function setHighestCelebratedMilestone(n: number) {
  try {
    localStorage.setItem(MILESTONE_KEY, String(n));
  } catch {
    // ignore
  }
}

function getNextMilestone(streak: number): number | null {
  for (const m of MILESTONES) {
    if (streak === m) return m;
  }
  return null;
}

// ── Milestone toast hook ──────────────────────────────────────────
export function useStreakMilestoneCelebration(stats: Stats | undefined) {
  const toast = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!stats || firedRef.current) return;

    const streak = stats.current_streak ?? 0;
    if (streak === 0) return;

    const milestone = getNextMilestone(streak);
    if (milestone === null) return;

    const alreadyCelebrated = getHighestCelebratedMilestone();
    if (alreadyCelebrated >= milestone) return;

    // Only fire once per component lifecycle
    firedRef.current = true;
    setHighestCelebratedMilestone(milestone);

    // Friendly milestone labels
    const label =
      milestone >= 365
        ? "365-day streak — a full year!"
        : `${milestone}-day streak`;

    toast.push({
      kind: "success",
      title: `${label} 🔥`,
      body:
        milestone >= 100
          ? "Extraordinary consistency. Keep going."
          : milestone >= 30
          ? "A month of daily learning — amazing work."
          : "Consistency is the secret to mastery.",
      durationMs: 6000,
    });
  }, [stats, toast]);
}

// ── Props ────────────────────────────────────────────────────────
interface StreakNudgeProps {
  stats: Stats | undefined;
  /** The slot number of the first open block, so "Start" links to it */
  firstOpenBlockSlot?: number;
}

// ── Component ────────────────────────────────────────────────────
export function StreakNudge({ stats, firstOpenBlockSlot }: StreakNudgeProps) {
  const router = useRouter();

  const streak = stats?.current_streak ?? 0;
  const reviewsToday = stats?.reviews_today ?? 0;
  const minutesToday = stats?.minutes_today ?? 0;
  const goalMinutes = stats?.daily_goal_minutes ?? 0;

  // ── Streak-at-risk banner ─────────────────────────────────────
  // Show when: streak > 0 AND no reviews done today
  const showStreakAtRisk = streak > 0 && reviewsToday === 0;

  // ── Daily goal nudge ──────────────────────────────────────────
  // Show when: goal is configured
  const goalConfigured = goalMinutes > 0;
  const goalMet = goalConfigured && minutesToday >= goalMinutes;
  const remaining = Math.max(0, goalMinutes - minutesToday);
  const showGoalNudge = goalConfigured;

  if (!showStreakAtRisk && !showGoalNudge) return null;

  const handleStart = () => {
    if (firstOpenBlockSlot !== undefined) {
      router.push(`/block/${firstOpenBlockSlot}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 20,
      }}
    >
      {/* Streak-at-risk banner */}
      {showStreakAtRisk && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid rgba(235, 87, 57, 0.18)",
            background: "rgba(235, 87, 57, 0.05)",
          }}
        >
          {/* Flame icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <path
              d="M7 1.5C7 1.5 9.5 4 9.5 6.5C9.5 7.88 8.38 9 7 9C5.62 9 4.5 7.88 4.5 6.5C4.5 5.5 5 4.5 5 4.5C5 4.5 4 5.5 4 6.5C4 8.43 5.57 10 7 10C8.43 10 10 8.43 10 6.5C10 3.5 7 1.5 7 1.5Z"
              fill="var(--warn)"
            />
          </svg>

          <p
            style={{
              fontSize: 13,
              color: "var(--text)",
              margin: 0,
              flex: 1,
              lineHeight: 1.4,
            }}
          >
            Review today to keep your{" "}
            <span
              style={{
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {streak}-day streak
            </span>{" "}
            🔥
          </p>

          <Button variant="primary" size="sm" onClick={handleStart}>
            Start
          </Button>
        </div>
      )}

      {/* Daily goal nudge */}
      {showGoalNudge && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 6,
            border: `1px solid ${goalMet ? "rgba(15,123,108,0.15)" : "var(--hairline)"}`,
            background: goalMet
              ? "rgba(15,123,108,0.04)"
              : "transparent",
          }}
        >
          {/* Check or clock icon */}
          {goalMet ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="5.5"
                stroke="var(--ok)"
                strokeWidth="1.2"
              />
              <path
                d="M4 6.5L5.8 8.3L9 5"
                stroke="var(--ok)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="5.5"
                stroke="var(--muted)"
                strokeWidth="1.2"
              />
              <path
                d="M6.5 4V6.5L8 8"
                stroke="var(--muted)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          <p
            style={{
              fontSize: 12,
              color: goalMet ? "var(--ok)" : "var(--muted)",
              margin: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {goalMet
              ? "Daily goal met 🎉"
              : `${remaining}m to your daily goal`}
          </p>
        </div>
      )}
    </div>
  );
}
