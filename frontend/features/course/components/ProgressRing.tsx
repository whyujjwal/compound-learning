export function ProgressRing({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <span className="course-progress-ring" data-pct={pct} role="img" aria-label={`${pct}% mastered`}>
      <span className="course-progress-ring-label">{pct}%</span>
    </span>
  );
}
