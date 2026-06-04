"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className = "appbar-icon-btn" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      {isLight ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 1.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 8 1.5ZM8 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.25 8a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm9.25-.75a.75.75 0 0 1 0 1.5h1.25a.75.75 0 0 1 0-1.5H11.5ZM3.63 3.63a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06Zm8.19 8.19a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 0 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06ZM3.63 12.37a.75.75 0 0 1 0-1.06l.88-.88a.75.75 0 1 1 1.06 1.06l-.88.88a.75.75 0 0 1-1.06 0Zm8.19-8.19a.75.75 0 0 1 0-1.06l.88-.88a.75.75 0 1 1 1.06 1.06l-.88.88a.75.75 0 0 1-1.06 0ZM12.25 8a.75.75 0 0 1 .75-.75H14a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1-.75-.75ZM8 12.25a.75.75 0 0 1 .75.75V14a.75.75 0 0 1-1.5 0v-1a.75.75 0 0 1 .75-.75Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8.44 1.5a.75.75 0 0 0-1.06 0 5.25 5.25 0 0 0 0 7.42.75.75 0 0 0 1.06-1.06 3.75 3.75 0 0 1 0-5.3.75.75 0 0 0 0-1.06ZM7.5 1.05a6.75 6.75 0 1 0 7.45 7.45.75.75 0 1 0-1.5-.17 5.25 5.25 0 1 1-5.78-5.78.75.75 0 0 0-.17-1.5Z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}
