"use client";

import { useEffect, useRef, useState } from "react";

export function BlockTimer({
  totalMinutes = 120,
  size = 120,
  onComplete,
  autoStart = false,
}: {
  totalMinutes?: number;
  size?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}) {
  const totalSec = totalMinutes * 60;
  const [remaining, setRemaining] = useState(totalSec);
  const [running, setRunning] = useState(autoStart);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onComplete]);

  function reset() {
    completedRef.current = false;
    setRemaining(totalSec);
    setRunning(false);
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const value = remaining / totalSec;
  const strokeWidth = 5;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * value;

  return (
    <div className="block-timer">
      <div className="block-timer-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--amber)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
        </svg>
        <div className="block-timer-text">
          <div className="block-timer-value">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <div className="block-timer-label">{running ? "in session" : remaining === 0 ? "done" : "paused"}</div>
        </div>
      </div>
      <div className="block-timer-controls">
        {remaining > 0 && (
          <button className={running ? "" : "primary"} onClick={() => setRunning((v) => !v)}>
            {running ? "Pause" : "Start"}
          </button>
        )}
        <button className="ghost" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
