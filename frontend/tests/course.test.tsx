/** @vitest-environment jsdom */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { CourseTree } from "@/features/course/types";
import { ResourceChip } from "@/features/course/components/ResourceChip";
import { KindBadge } from "@/features/course/components/KindBadge";
import { ProgressRing } from "@/features/course/components/ProgressRing";
import type { CourseMaterial } from "@/features/course/types";
import { OutlineTree } from "@/features/course/components/OutlineTree";
import { toElkGraph, statusColor } from "@/features/course/roadmap/roadmapLayout";
import type { RoadmapGraph } from "@/features/course/types";
import { RoadmapCanvas } from "@/features/course/roadmap/RoadmapCanvas";

describe("course types", () => {
  it("compiles a nested CourseTree literal", () => {
    const tree: CourseTree = {
      id: "1", slug: "s", name: "S", summary: null, color: "#6366f1",
      difficulty: null, estimated_hours: null, outcomes: [], prerequisites: [],
      version: 1, module_count: 0, material_count: 0, mastered_count: 0, modules: [],
    };
    expect(tree.slug).toBe("s");
  });
});

const material: CourseMaterial = {
  id: "m1", title: "Intro video", resource_type: "video", external_url: "https://youtu.be/x",
  has_content: false, provider: "YouTube", author: null, license: null, kind: "core", label: null,
  difficulty: "beginner", estimated_minutes: 12, priority_percent: 50, sequence: 0,
  resource_quality_score: 0.9, resource_health_status: "OK", card_state: null, started: true, mastered: false,
};

describe("ResourceChip", () => {
  it("shows the type icon, title, provider and duration", () => {
    render(<ResourceChip material={material} />);
    expect(screen.getByText("Intro video")).toBeTruthy();
    expect(screen.getByText(/YouTube/)).toBeTruthy();
    expect(screen.getByText(/12m/)).toBeTruthy();
    expect(screen.getByLabelText("video")).toBeTruthy();
  });
});

describe("KindBadge", () => {
  it("renders the kind label only when not core", () => {
    const { container, rerender } = render(<KindBadge kind="core" />);
    expect(container.textContent).toBe("");
    rerender(<KindBadge kind="optional" />);
    expect(screen.getByText("optional")).toBeTruthy();
  });
});

describe("ProgressRing", () => {
  it("renders the percentage label", () => {
    render(<ProgressRing value={3} total={4} />);
    expect(screen.getByText("75%")).toBeTruthy();
  });
});

const tree: CourseTree = {
  id: "t1", slug: "graphs", name: "Graphs", summary: null, color: "#6366f1",
  difficulty: "beginner", estimated_hours: 4, outcomes: ["Model graphs"], prerequisites: [],
  version: 1, module_count: 1, material_count: 1, mastered_count: 0,
  modules: [{
    id: "mod1", title: "Basics", objective: "learn", label: "Foundations", kind: "core",
    learning_outcomes: ["Explain adjacency"], sequence: 0, estimated_minutes: 12, difficulty: "beginner",
    material_count: 1, started_count: 0, mastered_count: 0,
    sections: [{
      id: "sec1", title: "Representations", objective: null, label: null, kind: "core",
      learning_outcomes: [], sequence: 0, estimated_minutes: 12, material_count: 1,
      started_count: 0, mastered_count: 0,
      materials: [material],
    }],
  }],
};

describe("OutlineTree", () => {
  it("renders modules and reveals sections/materials on expand", () => {
    render(<OutlineTree tree={tree} />);
    expect(screen.getByText("Basics")).toBeTruthy();
    expect(screen.getByText("Foundations")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Basics/ }));
    expect(screen.getByText("Representations")).toBeTruthy();
    expect(screen.getAllByText("Intro video").length).toBeGreaterThan(0);
  });
});

const graph: RoadmapGraph = {
  syllabus_id: "s", slug: "graphs", name: "Graphs", color: "#6366f1",
  nodes: [
    { id: "module-1", type: "module", parent_id: null, title: "M1", kind: "core", label: null, resource_type: null, status: "not_started", external_url: null, estimated_minutes: 10 },
    { id: "material-1", type: "material", parent_id: "section-1", title: "Vid", kind: "core", label: null, resource_type: "video", status: "mastered", external_url: null, estimated_minutes: 5 },
  ],
  edges: [{ id: "e1", source: "module-1", target: "material-1", kind: "primary" }],
};

describe("roadmapLayout", () => {
  it("maps graph nodes/edges to an elk spec with sized nodes", () => {
    const elk = toElkGraph(graph);
    expect(elk.children).toHaveLength(2);
    expect(elk.edges).toHaveLength(1);
    expect(elk.children[0].width).toBeGreaterThan(0);
    expect(elk.children[0].height).toBeGreaterThan(0);
  });

  it("colors by status", () => {
    expect(statusColor("mastered")).not.toBe(statusColor("not_started"));
  });
});

describe("RoadmapCanvas", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  });

  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("renders a legend and the syllabus title", () => {
    render(<RoadmapCanvas graph={graph} />);
    expect(screen.getByText(/Graphs/)).toBeTruthy();
    expect(screen.getByText(/Mastered/)).toBeTruthy();
  });

  it("shows empty state with no nodes", () => {
    render(<RoadmapCanvas graph={{ ...graph, nodes: [], edges: [] }} />);
    expect(screen.getByText(/Nothing to map yet/)).toBeTruthy();
  });
});
