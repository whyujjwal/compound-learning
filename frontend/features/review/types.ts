/**
 * Shared types for the review feature (session + block pages).
 */

export const GRADE_RATINGS = [
  {
    key: "AGAIN",
    label: "Again",
    shortcut: "1",
    hint: "Forgot — will review soon",
    tokenVar: "--bad",
  },
  {
    key: "HARD",
    label: "Hard",
    shortcut: "2",
    hint: "Got it with effort",
    tokenVar: "--warn",
  },
  {
    key: "GOOD",
    label: "Good",
    shortcut: "3",
    hint: "Recalled clearly",
    tokenVar: "--ok",
  },
  {
    key: "EASY",
    label: "Easy",
    shortcut: "4",
    hint: "Effortless",
    tokenVar: "--accent",
  },
] as const;

export type GradeKey = (typeof GRADE_RATINGS)[number]["key"];
