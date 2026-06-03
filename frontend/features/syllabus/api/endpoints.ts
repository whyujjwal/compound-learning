import { request } from "@/lib/api/client";
import type {
  ChangeLogEntry,
  SyllabusDetail,
  SyllabusListItem,
  SyllabusProposal,
} from "../types";

export const syllabusApi = {
  listSyllabi: () => request<SyllabusListItem[]>("/syllabi"),
  getSyllabusBySlug: (slug: string) => request<SyllabusDetail>(`/syllabi/slug/${slug}`),
  getSyllabus: (id: string) => request<SyllabusDetail>(`/syllabi/${id}`),
  createSyllabus: (data: {
    slug: string;
    name: string;
    summary?: string;
    visibility?: "PUBLIC" | "PRIVATE";
    color?: string;
  }) =>
    request<SyllabusDetail>("/syllabi", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addModule: (syllabusId: string, data: { title: string; objective?: string }) =>
    request<SyllabusDetail>(`/syllabi/${syllabusId}/modules`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteModule: (syllabusId: string, moduleId: string) =>
    request<SyllabusDetail>(`/syllabi/${syllabusId}/modules/${moduleId}`, {
      method: "DELETE",
    }),
  addMaterial: (
    syllabusId: string,
    data: { title: string; module_id?: string; external_url?: string; resource_type?: string }
  ) =>
    request<SyllabusDetail>(`/syllabi/${syllabusId}/materials`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteMaterial: (syllabusId: string, materialId: string) =>
    request<SyllabusDetail>(`/syllabi/${syllabusId}/materials/${materialId}`, {
      method: "DELETE",
    }),
  listMaterials: (syllabusId: string, params?: { q?: string; limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const qs = search.toString();
    return request<{ items: SyllabusDetail["modules"][0]["materials"]; total: number }>(
      `/syllabi/${syllabusId}/materials${qs ? `?${qs}` : ""}`
    );
  },
  createAiProposal: (syllabusId: string, instruction: string) =>
    request<SyllabusProposal>(`/syllabi/${syllabusId}/proposals/ai`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
    }),
  listProposals: (syllabusId: string) =>
    request<SyllabusProposal[]>(`/syllabi/${syllabusId}/proposals`),
  createProposal: (syllabusId: string, data: Record<string, unknown>) =>
    request<SyllabusProposal>(`/syllabi/${syllabusId}/proposals`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  applyProposal: (syllabusId: string, proposalId: string, operationIds?: string[]) =>
    request<SyllabusProposal>(`/syllabi/${syllabusId}/proposals/${proposalId}/apply`, {
      method: "POST",
      body: JSON.stringify({ operation_ids: operationIds }),
    }),
  rejectProposal: (syllabusId: string, proposalId: string) =>
    request<SyllabusProposal>(`/syllabi/${syllabusId}/proposals/${proposalId}/reject`, {
      method: "POST",
    }),
  getHistory: (syllabusId: string) =>
    request<ChangeLogEntry[]>(`/syllabi/${syllabusId}/history`),
};
