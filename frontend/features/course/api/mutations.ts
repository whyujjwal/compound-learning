import { request } from "@/lib/api/client";
import { syllabusApi } from "@/features/syllabus/api/endpoints";
import type { SyllabusProposal } from "@/features/syllabus/types";
import type { GenerateCourseRequest, GenerateCourseResponse, ManualOperation } from "../types";

export function generateCourse(body: GenerateCourseRequest) {
  return request<GenerateCourseResponse>("/syllabi/generate", {
    method: "POST",
    body: JSON.stringify(body),
    direct: true,
    timeoutMs: 120_000,
  });
}

export function buildManualProposalBody(op: ManualOperation) {
  const id = `manual-${Math.random().toString(36).slice(2, 10)}`;
  return {
    source: "MANUAL" as const,
    summary: op.reason ?? `Manual ${op.type}`,
    operations: [
      {
        id,
        type: op.type,
        target: op.target ?? {},
        payload: op.payload ?? {},
        reason: op.reason ?? null,
        risk: "low",
      },
    ],
  };
}

export async function applyManualOperation(syllabusId: string, op: ManualOperation): Promise<SyllabusProposal> {
  const created = await syllabusApi.createProposal(syllabusId, buildManualProposalBody(op));
  return syllabusApi.applyProposal(syllabusId, created.id, [created.operations[0].id]);
}
