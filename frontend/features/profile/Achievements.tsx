"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/primitives";
import { useGamification } from "@/lib/hooks/useToday";
import type { Achievement } from "@/lib/api/types";
import { LevelRing } from "@/features/home/LevelRing";

/* ── A single achievement tile ─────────────────────────────── */
function AchievementTile({ a }: { a: Achievement }) {
  const pct = Math.round((a.unlocked ? 1 : a.progress) * 100);
  return (
    <div
      title={a.description}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid var(--hairline)",
        background: a.unlocked ? "var(--accent-soft)" : "var(--panel)",
        transition: "background var(--dur), border-color var(--dur)",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          lineHeight: 1,
          background: a.unlocked ? "var(--canvas)" : "var(--overlay-hover)",
          filter: a.unlocked ? "none" : "grayscale(1)",
          opacity: a.unlocked ? 1 : 0.55,
        }}
      >
        {a.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: a.unlocked ? "var(--text)" : "var(--muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {a.title}
          </span>
          {a.unlocked && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-label="unlocked" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6.25" fill="var(--accent)" />
              <path d="M4.3 7.1L6 8.8l3.6-3.7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.4,
            marginBottom: a.unlocked ? 0 : 7,
          }}
        >
          {a.description}
        </p>
        {!a.unlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: "var(--overlay-active)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: 2,
                  transition: "width 0.5s var(--ease-out, ease)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {a.current}/{a.threshold}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Achievements section ──────────────────────────────────── */
export function Achievements() {
  const { data, isLoading } = useGamification();

  const grouped = useMemo(() => {
    if (!data) return [];
    const order: string[] = [];
    const byCat = new Map<string, Achievement[]>();
    for (const a of data.achievements) {
      if (!byCat.has(a.category)) {
        byCat.set(a.category, []);
        order.push(a.category);
      }
      byCat.get(a.category)!.push(a);
    }
    return order.map((cat) => ({ cat, items: byCat.get(cat)! }));
  }, [data]);

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} height={72} borderRadius={8} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const xpToNext = Math.max(0, data.level_xp_span - data.level_xp_into);

  return (
    <div>
      {/* Level summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 18px",
          borderRadius: 10,
          border: "1px solid var(--hairline)",
          background: "var(--panel)",
          marginBottom: 24,
        }}
      >
        <LevelRing level={data.level} xpInto={data.level_xp_into} xpSpan={data.level_xp_span} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Level {data.level}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              {data.xp_total.toLocaleString()} XP total
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
            {xpToNext.toLocaleString()} XP to level {data.next_level} · {data.achievements_unlocked}/
            {data.achievements_total} achievements
          </p>
          {/* Slim XP bar */}
          <div
            style={{
              marginTop: 10,
              height: 5,
              borderRadius: 3,
              background: "var(--overlay-active)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${data.level_xp_span > 0 ? Math.round((data.level_xp_into / data.level_xp_span) * 100) : 0}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: 3,
                transition: "width 0.5s var(--ease-out, ease)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Badge grid by category */}
      {grouped.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 10,
            }}
          >
            {cat}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {items.map((a) => (
              <AchievementTile key={a.slug} a={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
