export function OutcomeList({ outcomes, heading }: { outcomes: string[]; heading?: string }) {
  if (!outcomes.length) return null;
  return (
    <div className="course-outcomes">
      {heading ? <span className="course-outcomes-heading">{heading}</span> : null}
      <ul>
        {outcomes.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </div>
  );
}
