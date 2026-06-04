import { Badge } from "@/components/primitives";
import type { NodeKind } from "../types";

const kindColor: Record<NodeKind, React.ComponentProps<typeof Badge>["color"]> = {
  core: "muted",
  optional: "default",
  bonus: "accent",
};

export function KindBadge({ kind, label }: { kind: NodeKind; label?: string | null }) {
  return (
    <>
      {label ? <Badge color="accent">{label}</Badge> : null}
      {kind !== "core" ? <Badge color={kindColor[kind]}>{kind}</Badge> : null}
    </>
  );
}
