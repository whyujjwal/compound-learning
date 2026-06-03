/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SyllabusCard } from "@/features/syllabus/components/SyllabusCard";
import { ProposalOperationRow } from "@/features/syllabus/proposals/ProposalOperationRow";

describe("SyllabusCard", () => {
  it("renders syllabus name and progress", () => {
    render(
      <SyllabusCard
        syllabus={{
          id: "1",
          slug: "test",
          name: "Test Syllabus",
          summary: "A test",
          color: "#6366f1",
          visibility: "PRIVATE",
          module_count: 2,
          material_count: 10,
          started_count: 4,
          mastered_count: 2,
          due_review_count: 1,
          health_score: 80,
          updated_at: new Date().toISOString(),
        }}
      />
    );
    expect(screen.getByText("Test Syllabus")).toBeTruthy();
    expect(screen.getByText("20%")).toBeTruthy();
  });
});

describe("ProposalOperationRow", () => {
  it("renders operation label and title", () => {
    render(
      <ProposalOperationRow
        operation={{
          id: "op-1",
          type: "material.add",
          target: {},
          payload: { title: "New material" },
        }}
        selected
        onToggle={() => {}}
      />
    );
    expect(screen.getByText("Add material")).toBeTruthy();
    expect(screen.getByText("New material")).toBeTruthy();
  });
});
