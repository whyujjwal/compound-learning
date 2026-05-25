/**
 * Curated track palette — overrides the colors stored in the DB so the brand
 * stays consistent regardless of which hex was seeded.
 *
 * Falls back to the DB-supplied color for any slug we don't recognize.
 */
const PALETTE: Record<string, string> = {
  dsa: "#f59e0b", // saffron
  "ai-math": "#38bdf8", // electric blue
  "llm-ml": "#34d399", // electric green
  "system-design": "#f472b6", // magenta
  review: "#a78bfa", // violet
};

export function trackAccent(slug: string, fallback?: string): string {
  return PALETTE[slug] ?? fallback ?? "#c89b6b";
}
