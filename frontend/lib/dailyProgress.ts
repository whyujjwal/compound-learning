import { getLocalDateKey } from "./time";

const KEY = "compound:daily-progress";

type DailyProgress = {
  date: string;
  completedSlots: number[];
};

function todayKey(): string {
  return getLocalDateKey();
}

function load(): DailyProgress {
  if (typeof window === "undefined") {
    return { date: todayKey(), completedSlots: [] };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { date: todayKey(), completedSlots: [] };
    const parsed = JSON.parse(raw) as DailyProgress;
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), completedSlots: [] };
    }
    return parsed;
  } catch {
    return { date: todayKey(), completedSlots: [] };
  }
}

function save(state: DailyProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function getCompletedSlots(): number[] {
  return load().completedSlots;
}

export function isBlockComplete(slot: number): boolean {
  return load().completedSlots.includes(slot);
}

export function markBlockComplete(slot: number) {
  const state = load();
  if (!state.completedSlots.includes(slot)) {
    state.completedSlots.push(slot);
    save(state);
  }
}

export function countCompleted(slots: number[]): number {
  const done = new Set(getCompletedSlots());
  return slots.filter((s) => done.has(s)).length;
}

export const SESSION_SLOT_KEY = "compound:session-block-slot";

export function setActiveBlockSlot(slot: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_SLOT_KEY, String(slot));
  } catch {}
}

export function getActiveBlockSlot(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_SLOT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function clearActiveBlockSlot() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_SLOT_KEY);
  } catch {}
}
