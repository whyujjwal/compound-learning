import type { NodeKind } from "../types";

export function KindBadge({ kind, label }: { kind: NodeKind; label?: string | null }) {
  return (
    <>
      {label ? <span className="course-label-badge">{label}</span> : null}
      {kind !== "core" ? <span className={`course-kind-badge kind-${kind}`}>{kind}</span> : null}
    </>
  );
}
