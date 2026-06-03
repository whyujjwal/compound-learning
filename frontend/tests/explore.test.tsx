/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ExploreCard } from "@/features/explore/ExploreCard";
import type { CatalogTrack } from "@/lib/api";

const base: CatalogTrack = {
  id: "t1", slug: "kafka", name: "Kafka Deep Dive", description: "Streaming systems.",
  color: "#6366f1", creator_name: "A", creator_id: "c1", material_count: 40, module_count: 6,
  star_count: 12, adoption_count: 3, rating_count: 2, rating_avg: 4.5, quality_score: 80,
  is_featured: false, is_starred: false, already_in_library: false, rank_score: 50, source_track_id: null,
  learning_outcomes: [], prerequisites: [], target_audience: null, estimated_hours: 10,
  difficulty: "intermediate", syllabus_summary: null, syllabus_preview: [],
  created_at: new Date().toISOString(), published_at: null,
};

describe("ExploreCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a single Add action when not owned", () => {
    const onAdopt = vi.fn();
    render(<ExploreCard track={base} busy={false} onAdopt={onAdopt} />);
    expect(screen.getByText("Kafka Deep Dive")).toBeTruthy();
    expect(screen.getByText(/40 materials/)).toBeTruthy();
    const add = screen.getByRole("button", { name: /Add to library/ });
    fireEvent.click(add);
    expect(onAdopt).toHaveBeenCalledWith(base);
    expect(screen.queryByText(/Remix/)).toBeNull();
    expect(screen.queryByText(/quality/)).toBeNull();
  });

  it("shows owned state instead of Add when already in library", () => {
    render(<ExploreCard track={{ ...base, already_in_library: true }} busy={false} onAdopt={vi.fn()} />);
    expect(screen.getByText(/In your library/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add to library/ })).toBeNull();
  });
});
