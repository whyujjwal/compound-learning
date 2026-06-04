import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: number | string;
  /** Inline block for text-like skeletons */
  inline?: boolean;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 4,
  inline = false,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: inline ? "inline-block" : "block",
        width,
        height,
        borderRadius,
        background: "var(--skeleton-from)",
        backgroundImage:
          "linear-gradient(90deg, var(--skeleton-from) 0%, var(--skeleton-to) 50%, var(--skeleton-from) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease-in-out infinite",
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    />
  );
}

// Keyframes in a global style tag (appended once)
const KEYFRAME_ID = "__skeleton_keyframe__";
if (typeof document !== "undefined" && !document.getElementById(KEYFRAME_ID)) {
  const style = document.createElement("style");
  style.id = KEYFRAME_ID;
  style.textContent = `@keyframes skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`;
  document.head.appendChild(style);
}
