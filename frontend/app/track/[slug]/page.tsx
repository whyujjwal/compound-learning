"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TrackRedirectPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();

  useEffect(() => {
    if (slug) router.replace(`/library/${slug}`);
  }, [slug, router]);

  return (
    <>
      <h1 className="roadmap-title">Redirecting…</h1>
      <p style={{ color: "var(--fg-mute)" }}>Opening syllabus in Library.</p>
    </>
  );
}
