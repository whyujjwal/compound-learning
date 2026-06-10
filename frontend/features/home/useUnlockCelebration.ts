"use client";

import { useToast } from "@/components/primitives";
import type { Achievement } from "@/lib/api/types";

/**
 * Returns a `celebrate(newly)` function that fires a success toast for each
 * freshly-unlocked achievement. Safe to call with undefined / empty lists.
 */
export function useUnlockCelebration() {
  const toast = useToast();
  return (newly: Achievement[] | undefined) => {
    if (!newly?.length) return;
    for (const a of newly) {
      toast.push({
        kind: "success",
        title: `${a.icon}  Achievement unlocked`,
        body: `${a.title} — ${a.description}`,
        durationMs: 6000,
      });
    }
  };
}
