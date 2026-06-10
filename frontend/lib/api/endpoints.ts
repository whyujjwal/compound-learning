import { PaginationParams, queryString, request, setPagination } from "./client";
import type {
  AuthResponse,
  BlockSession,
  ChatMessage,
  CardDetail,
  CatalogCollection,
  CatalogTrack,
  CatalogTrackDetail,
  CoachInsight,
  Conversation,
  CreatorProfile,
  CurriculumOverview,
  DailyQueue,
  GeneratedRoadmap,
  GraphNode,
  KnowledgeGraph,
  Leaderboards,
  GamificationProfile,
  Material,
  Organization,
  QueueItem,
  ReviewResult,
  RoadmapGenerationSummary,
  Stats,
  StudySession,
  Track,
  TrackAIUpdate,
  TrackProgress,
  User,
  WeeklySchedule,
} from "./types";

export const userEndpoints = {
  getUser: () => request<User>("/user/me"),
  updateUser: (
    data: Partial<
      Pick<
        User,
        | "target_retention"
        | "daily_study_minutes"
        | "daily_new_cards"
        | "paused_tracks"
        | "display_name"
        | "milestone_title"
        | "milestone_date"
        | "learning_goals"
        | "onboarded"
      >
    > & { weekly_schedule?: WeeklySchedule }
  ) => request<User>("/user/me", { method: "PATCH", body: JSON.stringify(data) }),
};

export const curriculumEndpoints = {
  generateRoadmap: (data: {
    goals: string;
    weekly_hours?: number;
    level?: string;
    apply?: boolean;
    replace?: boolean;
  }) =>
    request<GeneratedRoadmap>("/curriculum/generate", {
      method: "POST",
      body: JSON.stringify(data),
      direct: true,
      timeoutMs: 300_000,
    }),

  listRoadmapGenerations: (params?: PaginationParams) => {
    const search = new URLSearchParams();
    setPagination(search, params);
    return request<RoadmapGenerationSummary[]>(`/curriculum/generations${queryString(search)}`);
  },

  getRoadmapGeneration: (id: string) =>
    request<RoadmapGenerationSummary & { curriculum: GeneratedRoadmap["curriculum"] }>(
      `/curriculum/generations/${id}`
    ),

  deleteRoadmapGeneration: (id: string) =>
    request<void>(`/curriculum/generations/${id}`, { method: "DELETE" }),

  getCurriculumOverview: () => request<CurriculumOverview>("/curriculum/overview"),
  getWeeklySchedule: () => request<WeeklySchedule>("/curriculum/schedule"),
  setWeeklySchedule: (schedule: WeeklySchedule) =>
    request<WeeklySchedule>("/curriculum/schedule", {
      method: "PUT",
      body: JSON.stringify(schedule),
    }),
  getTodaySchedule: () =>
    request<{ block: number; track: string; track_name: string | null }[]>("/curriculum/schedule/today"),
  getExampleCurriculum: () => request<GeneratedRoadmap["curriculum"]>("/curriculum/examples"),
  importExampleCurriculum: () =>
    request<Record<string, number>>("/curriculum/import/examples", { method: "POST" }),
  importCurriculum: () => request<Record<string, number>>("/curriculum/import/default", { method: "POST" }),
  importCurriculumInline: (data: GeneratedRoadmap["curriculum"], replace = false) =>
    request<Record<string, number>>("/curriculum/import", {
      method: "POST",
      body: JSON.stringify({ data, replace }),
    }),
};

export const trackEndpoints = {
  getTracks: (params?: PaginationParams) => {
    const search = new URLSearchParams();
    setPagination(search, params);
    return request<Track[]>(`/tracks${queryString(search)}`);
  },
  getTrack: (id: string) => request<Track>(`/tracks/${id}`),
  createTrack: (data: {
    slug: string;
    name: string;
    description?: string;
    color?: string;
    cognitive_multiplier?: number;
    is_public?: boolean;
  }) => request<Track>("/tracks", { method: "POST", body: JSON.stringify(data) }),
  updateTrack: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
      cognitive_multiplier: number;
      is_public: boolean;
      is_featured: boolean;
    }>
  ) => request<Track>(`/tracks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTrack: (id: string) => request<void>(`/tracks/${id}`, { method: "DELETE" }),
  updateTrackWithAI: (id: string, instruction: string, apply = true) =>
    request<TrackAIUpdate>(`/tracks/${id}/ai-updates`, {
      method: "POST",
      body: JSON.stringify({ instruction, apply }),
      direct: true,
      timeoutMs: 300_000,
    }),
  getTrackProgress: (slug: string) => request<TrackProgress>(`/tracks/slug/${slug}/progress`),
};

export const catalogEndpoints = {
  getCatalogTracks: (params?: {
    q?: string;
    featured?: boolean;
    sort?: "ranking" | "stars" | "new";
  } & PaginationParams) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.featured) search.set("featured", "true");
    if (params?.sort) search.set("sort", params.sort);
    setPagination(search, params);
    return request<CatalogTrack[]>(`/catalog/tracks${queryString(search)}`);
  },
  getCatalogTrack: (id: string) => request<CatalogTrackDetail>(`/catalog/tracks/${id}`),
  starCatalogTrack: (id: string) =>
    request<CatalogTrack>(`/catalog/tracks/${id}/star`, { method: "POST" }),
  unstarCatalogTrack: (id: string) =>
    request<CatalogTrack>(`/catalog/tracks/${id}/star`, { method: "DELETE" }),
  adoptCatalogTrack: (id: string) =>
    request<{ track_id: string; slug: string; materials_created: number }>(
      `/catalog/tracks/${id}/adopt`,
      { method: "POST" }
    ),
  rateCatalogTrack: (id: string, rating: number, note?: string) =>
    request<CatalogTrack>(`/catalog/tracks/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating, note }),
    }),
  getCatalogCollections: (params?: PaginationParams & { trackLimit?: number; trackOffset?: number }) => {
    const search = new URLSearchParams();
    setPagination(search, params);
    if (params?.trackLimit) search.set("track_limit", String(params.trackLimit));
    if (params?.trackOffset) search.set("track_offset", String(params.trackOffset));
    return request<CatalogCollection[]>(`/catalog/collections${queryString(search)}`);
  },
  getCreatorProfile: (id: string) => request<CreatorProfile>(`/catalog/creators/${id}`),
  getLeaderboards: (params?: { trackLimit?: number; trackOffset?: number; creatorLimit?: number }) => {
    const search = new URLSearchParams();
    if (params?.trackLimit) search.set("track_limit", String(params.trackLimit));
    if (params?.trackOffset) search.set("track_offset", String(params.trackOffset));
    if (params?.creatorLimit) search.set("creator_limit", String(params.creatorLimit));
    return request<Leaderboards>(`/catalog/leaderboards${queryString(search)}`);
  },
};

export const studyEndpoints = {
  getMaterials: (trackId?: string, params?: PaginationParams) => {
    const search = new URLSearchParams();
    if (trackId) search.set("track_id", trackId);
    setPagination(search, params);
    return request<Material[]>(`/materials${queryString(search)}`);
  },
  getMaterial: (id: string) => request<Material>(`/materials/${id}`),
  createMaterial: (data: {
    track_id: string;
    title: string;
    raw_content?: string;
    external_url?: string;
    block_label?: string;
    resource_type?: string;
    sequence?: number;
    cognitive_cost_multiplier?: number;
    estimated_minutes?: number;
    priority_percent?: number;
    prerequisite_material_id?: string;
  }) => request<Material>("/materials", { method: "POST", body: JSON.stringify(data) }),
  updateMaterial: (
    id: string,
    data: Partial<{
      title: string;
      raw_content: string;
      external_url: string;
      block_label: string;
      resource_type: string;
      sequence: number;
      cognitive_cost_multiplier: number;
      estimated_minutes: number;
      priority_percent: number;
    }>
  ) => request<Material>(`/materials/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMaterial: (id: string) => request<void>(`/materials/${id}`, { method: "DELETE" }),

  getCards: (trackId?: string, params?: PaginationParams) => {
    const search = new URLSearchParams();
    if (trackId) search.set("track_id", trackId);
    setPagination(search, params);
    return request<CardDetail[]>(`/cards${queryString(search)}`);
  },
  getCard: (id: string) => request<CardDetail>(`/cards/${id}`),

  getDailyQueue: () => request<DailyQueue>("/queue/daily"),
  startBlockSession: (slot: number) =>
    request<BlockSession>(`/blocks/${slot}/start`, { method: "POST" }),
  getBlockSession: (slot: number) => request<BlockSession>(`/blocks/${slot}`),
  submitBlockReview: (slot: number, cardId: string, rating: string, elapsed: number) =>
    request<BlockSession>(`/blocks/${slot}/items/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, elapsed_time_seconds: elapsed }),
    }),
  submitReview: (cardId: string, rating: string, elapsed: number) =>
    request<ReviewResult>(`/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, elapsed_time_seconds: elapsed }),
    }),
  getExtraQueue: (trackSlug: string, count = 5, excludeCardIds: string[] = []) => {
    const params = new URLSearchParams({ track: trackSlug, count: String(count) });
    for (const id of excludeCardIds) params.append("exclude", id);
    return request<QueueItem[]>(`/queue/extra?${params.toString()}`);
  },

  logSession: (data: {
    material_id: string;
    duration_minutes?: number;
    completion_status?: "STARTED" | "COMPLETED" | "SKIPPED";
    self_rating?: number;
    notes?: string;
    external_evidence_url?: string;
  }) =>
    request<StudySession>("/sessions", { method: "POST", body: JSON.stringify(data) }),

  completeMaterial: (materialId: string, notes?: string) =>
    request<StudySession>(
      `/materials/${materialId}/complete${notes ? `?notes=${encodeURIComponent(notes)}` : ""}`,
      { method: "POST" }
    ),

  getRecentSessions: (limit = 20, offset = 0) =>
    request<StudySession[]>(`/sessions/recent?limit=${limit}&offset=${offset}`),
};

export const insightsEndpoints = {
  getStats: () => request<Stats>("/stats"),
  getGamificationProfile: () => request<GamificationProfile>("/gamification/profile"),
  getActivity: (days = 120) =>
    request<{ date: string; count: number }[]>(`/stats/activity?days=${days}`),
  getRetentionTimeline: (days = 30) =>
    request<{ date: string; retention: number; reviews: number }[]>(
      `/stats/retention-timeline?days=${days}`
    ),

  getAIStatus: () => request<{ enabled: boolean; provider: string; model: string }>("/chat/status"),
  listConversations: (params?: PaginationParams) => {
    const search = new URLSearchParams();
    setPagination(search, params);
    return request<{ id: string; title: string; created_at: string; updated_at: string; message_count: number }[]>(
      `/chat/conversations${queryString(search)}`
    );
  },
  createConversation: (title?: string) =>
    request<Conversation>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getConversation: (id: string, params?: { messageLimit?: number; messageOffset?: number }) => {
    const search = new URLSearchParams();
    if (params?.messageLimit) search.set("message_limit", String(params.messageLimit));
    if (params?.messageOffset) search.set("message_offset", String(params.messageOffset));
    return request<Conversation>(`/chat/conversations/${id}${queryString(search)}`);
  },
  deleteConversation: (id: string) =>
    request<void>(`/chat/conversations/${id}`, { method: "DELETE" }),
  sendMessage: (convId: string, content: string) =>
    request<{
      user_message: ChatMessage;
      assistant_message: ChatMessage;
      conversation_title: string;
    }>(`/chat/conversations/${convId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  getDailyInsight: (refresh = false) =>
    request<CoachInsight>(`/chat/insights/daily${refresh ? "?refresh=true" : ""}`),
  getWeeklyInsight: (refresh = false) =>
    request<CoachInsight>(`/chat/insights/weekly${refresh ? "?refresh=true" : ""}`),

  getKnowledgeGraph: (slug: string) => request<KnowledgeGraph>(`/knowledge-graph/track/${slug}`),
  getLeeches: (limit = 20, offset = 0) =>
    request<GraphNode[]>(`/knowledge-graph/leeches?limit=${limit}&offset=${offset}`),
};

export const authEndpoints = {
  listOrganizations: (params?: PaginationParams) => {
    const search = new URLSearchParams();
    setPagination(search, params);
    return request<Organization[]>(`/organizations${queryString(search)}`);
  },

  createOrganization: (data: { name: string; slug: string; description?: string }) =>
    request<Organization>("/organizations", { method: "POST", body: JSON.stringify(data) }),

  register: (email: string, password: string, display_name?: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    }),

  getGoogleAuthStatus: () => request<{ enabled: boolean }>("/auth/google/status"),

  loginWithEmail: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(email ? { email, password } : { password }),
    }),
};
