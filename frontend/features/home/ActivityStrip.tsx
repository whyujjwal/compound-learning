"use client";

import Link from "next/link";
import { useActivity } from "@/lib/hooks";
import { Skeleton } from "@/components/primitives";
import { ContributionGraph } from "@/components/charts";

export function ActivityStrip() {
  const { data, isLoading } = useActivity(119);
  const activity = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div
        style={{
          paddingTop: 24,
          borderTop: "1px solid var(--hairline)",
          marginTop: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Skeleton width={56} height={11} borderRadius={3} />
          <Skeleton width={48} height={11} borderRadius={3} />
        </div>
        <Skeleton width={280} height={88} borderRadius={4} />
      </div>
    );
  }

  if (!activity || activity.length === 0) return null;

  return (
    <div
      style={{
        paddingTop: 24,
        borderTop: "1px solid var(--hairline)",
        marginTop: 32,
      }}
    >
      {/* Section heading row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          Activity
        </span>
        <Link
          href="/profile"
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            transition: "color var(--dur-fast)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
          }}
        >
          View all
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Shared ContributionGraph */}
      <ContributionGraph
        data={activity}
        weeks={17}
        colorScheme="accent"
        cellSize={11}
        gap={3}
        showFooter={false}
      />
    </div>
  );
}
