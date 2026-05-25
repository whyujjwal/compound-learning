export function Skeleton({
  width,
  height,
  radius = 4,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className ?? ""}`}
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: radius,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = "60%" }: { lines?: number; lastWidth?: string | number }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? lastWidth : "100%"}
        />
      ))}
    </div>
  );
}
