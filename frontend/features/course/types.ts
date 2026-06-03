import type { SyllabusDetail, SyllabusProposal } from "@/features/syllabus/types";

export type NodeKind = "core" | "optional" | "bonus";
export type MaterialStatus = "not_started" | "started" | "mastered";

export interface CourseMaterial {
  id: string;
  title: string;
  resource_type: string | null;
  external_url: string | null;
  has_content: boolean;
  provider: string | null;
  author: string | null;
  license: string | null;
  kind: NodeKind;
  label: string | null;
  difficulty: string | null;
  estimated_minutes: number;
  priority_percent: number;
  sequence: number;
  resource_quality_score: number;
  resource_health_status: string;
  card_state: string | null;
  started: boolean;
  mastered: boolean;
}

export interface CourseSection {
  id: string;
  title: string;
  objective: string | null;
  label: string | null;
  kind: NodeKind;
  learning_outcomes: string[];
  sequence: number;
  estimated_minutes: number;
  material_count: number;
  started_count: number;
  mastered_count: number;
  materials: CourseMaterial[];
}

export interface CourseModule {
  id: string;
  title: string;
  objective: string | null;
  label: string | null;
  kind: NodeKind;
  learning_outcomes: string[];
  sequence: number;
  estimated_minutes: number;
  difficulty: string | null;
  material_count: number;
  started_count: number;
  mastered_count: number;
  sections: CourseSection[];
}

export interface CourseTree {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  color: string;
  difficulty: string | null;
  estimated_hours: number | null;
  outcomes: string[];
  prerequisites: string[];
  version: number;
  module_count: number;
  material_count: number;
  mastered_count: number;
  modules: CourseModule[];
}

export interface RoadmapNode {
  id: string;
  type: "module" | "section" | "material";
  parent_id: string | null;
  title: string;
  kind: NodeKind;
  label: string | null;
  resource_type: string | null;
  status: MaterialStatus;
  external_url: string | null;
  estimated_minutes: number;
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
  kind: "primary" | "requires" | "recommends" | "related";
}

export interface RoadmapGraph {
  syllabus_id: string;
  slug: string;
  name: string;
  color: string;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

export interface GenerateCourseRequest {
  name: string;
  goal: string;
  level?: string;
  weekly_hours?: number;
  color?: string;
}

export interface GenerateCourseResponse {
  syllabus: SyllabusDetail;
  proposal: SyllabusProposal;
}

export interface ManualOperation {
  type: string;
  target?: { syllabus_id?: string; module_id?: string; section_id?: string; material_id?: string };
  payload?: Record<string, unknown>;
  reason?: string;
}
