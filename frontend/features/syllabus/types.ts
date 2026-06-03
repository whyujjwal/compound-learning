import type { Track, TrackProgress, CurriculumOverview } from "@/lib/api/types";

export type SyllabusVisibility = "PUBLIC" | "PRIVATE";

export interface SyllabusListItem {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  color: string;
  visibility: SyllabusVisibility;
  module_count: number;
  material_count: number;
  started_count: number;
  mastered_count: number;
  due_review_count: number;
  health_score: number;
  updated_at: string;
}

export interface SyllabusMaterial {
  id: string;
  title: string;
  external_url: string | null;
  resource_type: string | null;
  estimated_minutes: number;
  sequence: number;
  difficulty: string | null;
  resource_quality_score?: number;
  card_state: string | null;
}

export interface SyllabusModule {
  id: string;
  title: string;
  description: string | null;
  objective: string;
  sequence: number;
  estimated_minutes: number;
  difficulty: string;
  quiz_prompt: string | null;
  project_prompt: string | null;
  material_count: number;
  started_count: number;
  mastered_count: number;
  materials: SyllabusMaterial[];
}

export interface SyllabusDetail {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  color: string;
  visibility: SyllabusVisibility;
  outcomes: string[];
  modules: SyllabusModule[];
  version: number;
  permissions: {
    can_edit: boolean;
    can_publish: boolean;
  };
}

export type SyllabusTab = "overview" | "studio" | "map" | "materials" | "practice" | "history";

export interface ProposalOperation {
  id: string;
  type: string;
  target: {
    syllabus_id?: string;
    module_id?: string | null;
    material_id?: string | null;
  };
  payload: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  reason?: string | null;
  risk?: string;
}

export interface SyllabusProposal {
  id: string;
  syllabus_id: string;
  source: string;
  status: string;
  instruction: string | null;
  summary: string | null;
  base_version: number;
  operations: ProposalOperation[];
  selected_operation_ids: string[] | null;
  applied_operation_ids: string[] | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
}

export interface ChangeLogEntry {
  id: string;
  proposal_id: string | null;
  operation_id: string | null;
  operation_type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export function trackToSyllabusListItem(track: Track): SyllabusListItem {
  const materialCount = track.material_count ?? 0;
  const masteredCount = 0;
  return {
    id: track.id,
    slug: track.slug,
    name: track.name,
    summary: track.syllabus_summary ?? track.description,
    color: track.color,
    visibility: track.is_public ? "PUBLIC" : "PRIVATE",
    module_count: track.modules?.length ?? 0,
    material_count: materialCount,
    started_count: 0,
    mastered_count: masteredCount,
    due_review_count: track.due_card_count ?? 0,
    health_score: materialCount ? 70 : 100,
    updated_at: new Date().toISOString(),
  };
}

export function overviewTrackToSyllabusListItem(
  track: CurriculumOverview["tracks"][number]
): SyllabusListItem {
  const pct = track.material_count ? track.mastered_count / track.material_count : 0;
  return {
    id: track.id,
    slug: track.slug,
    name: track.name,
    summary: track.description,
    color: track.color,
    visibility: "PRIVATE",
    module_count: 0,
    material_count: track.material_count,
    started_count: track.started_count,
    mastered_count: track.mastered_count,
    due_review_count: track.due_review_count,
    health_score: Math.round(pct * 100),
    updated_at: new Date().toISOString(),
  };
}

export function progressToSyllabusDetail(
  progress: TrackProgress,
  track: Track | undefined
): SyllabusDetail {
  return {
    id: progress.track_id,
    slug: progress.slug,
    name: progress.name,
    summary: track?.syllabus_summary ?? track?.description ?? null,
    color: progress.color,
    visibility: track?.is_public ? "PUBLIC" : "PRIVATE",
    outcomes: track?.learning_outcomes ?? [],
    modules: progress.modules.map((m) => ({
      id: String(m.id),
      title: m.title,
      description: m.description,
      objective: m.objective,
      sequence: m.sequence,
      estimated_minutes: m.estimated_minutes,
      difficulty: m.difficulty,
      quiz_prompt: m.quiz_prompt,
      project_prompt: m.project_prompt,
      material_count: m.material_count,
      started_count: m.started_count ?? 0,
      mastered_count: m.mastered_count ?? 0,
      materials: m.materials.map((mat) => ({
        id: String(mat.id),
        title: mat.title,
        external_url: mat.external_url,
        resource_type: mat.resource_type,
        estimated_minutes: mat.estimated_minutes,
        sequence: mat.sequence,
        difficulty: mat.difficulty ?? null,
        card_state: mat.card_state ?? null,
      })),
    })),
    version: 1,
    permissions: { can_edit: true, can_publish: true },
  };
}
