"use client";

import Link from "next/link";
import { useWeeklySchedule, useTodaySchedule } from "@/lib/hooks";
import { PageContent } from "@/components/shell";
import { EmptyState } from "@/components/primitives";
import { WeekGrid, WeekGridSkeleton } from "@/features/plan";

export default function PlanPage() {
  const { data: schedule, isLoading: schedLoading } = useWeeklySchedule();
  const { data: todayBlocks = [], isLoading: todayLoading } = useTodaySchedule();

  const isLoading = schedLoading || todayLoading;

  // Detect empty: schedule loaded but every day is an empty array
  const isEmpty =
    !isLoading &&
    schedule != null &&
    Object.values(schedule).every((day) => (day as unknown[]).length === 0);

  // Completely absent (no schedule from API at all)
  const noSchedule = !isLoading && schedule == null;

  return (
    <PageContent style={{ paddingTop: 40, paddingBottom: 64 }}>
      {/* ── Page heading ────────────────────────────────────── */}
      <header style={{ marginBottom: 32 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 4,
          }}
        >
          Weekly Plan
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
            marginBottom: 6,
          }}
        >
          This week
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
          Your HEFT-planned study schedule
        </p>
      </header>

      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && <WeekGridSkeleton />}

      {/* ── Empty / no schedule ─────────────────────────────── */}
      {(isEmpty || noSchedule) && !isLoading && (
        <EmptyState
          icon={
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden
            >
              <rect
                x="4"
                y="5"
                width="24"
                height="22"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M4 12h24" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M11 4v4M21 4v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M10 19h5M10 23h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
          title="No weekly plan yet"
          description="Generate a roadmap to get a HEFT-planned schedule that distributes your study blocks intelligently across the week."
          action={
            <Link
              href="/library/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 5,
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                background: "var(--accent)",
                textDecoration: "none",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "var(--accent)";
              }}
            >
              Generate a roadmap
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 6H10M7 3L10 6L7 9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          }
        />
      )}

      {/* ── Week grid ────────────────────────────────────────── */}
      {!isLoading && schedule != null && !isEmpty && (
        <WeekGrid
          schedule={schedule}
          todayBlocks={todayBlocks}
          isLoading={false}
        />
      )}

      {/* ── Footer hint ─────────────────────────────────────── */}
      {!isLoading && schedule != null && !isEmpty && (
        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          Blocks link directly to your study session.{" "}
          <Link
            href="/library/new"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              transition: "text-decoration 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration =
                "underline";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.textDecoration =
                "none";
            }}
          >
            Regenerate schedule
          </Link>
        </p>
      )}
    </PageContent>
  );
}
