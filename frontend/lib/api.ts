import { getAuthToken } from "./auth";
import { getClientTimezone } from "./time";

/** Same-origin /api in the browser (proxied by Next.js); absolute URL for any server-side use. */
export function getApiBase(): string {
  if (typeof window !== "undefined") return "/api";
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
}

function errorMessageFromBody(raw: string, fallback: string): string {
  if (!raw) return fallback;
  try {
    const body = JSON.parse(raw) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) =>
          typeof item === "object" && item && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : String(item)
        )
        .join("; ");
    }
    return JSON.stringify(body);
  } catch {
    return raw;
  }
}

/** Direct API URL for long-running browser calls (bypasses Next.js proxy). */
function getDirectApiBase(): string | null {
  if (typeof window === "undefined") return null;
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

type RequestOptions = RequestInit & {
  /** Call NEXT_PUBLIC_API_URL directly (needed for 60s+ AI requests). */
  direct?: boolean;
  timeoutMs?: number;
};

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { direct, timeoutMs, ...fetchOptions } = options ?? {};
  const base = direct && getDirectApiBase() ? getDirectApiBase()! : getApiBase();
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const timezone = typeof window !== "undefined" ? getClientTimezone() : null;
  const res = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(timezone ? { "X-Compound-Timezone": timezone } : {}),
      ...fetchOptions.headers,
    },
    cache: "no-store",
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : fetchOptions.signal,
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const { clearAuthToken } = await import("./auth");
      clearAuthToken();
      window.location.href = "/login";
      throw new Error("Session expired — please sign in again");
    }
    const raw = await res.text();
    throw new Error(errorMessageFromBody(raw, res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Track = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  cognitive_multiplier: number;
  is_system: boolean;
  is_public: boolean;
  is_featured: boolean;
  star_count: number;
  adoption_count: number;
  rating_count: number;
  rating_avg: number;
  quality_score: number;
  source_track_id: string | null;
  generation_prompt: string | null;
  material_count: number;
  due_card_count: number;
};

export type CatalogTrack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  creator_name: string | null;
  creator_id: string;
  material_count: number;
  module_count: number;
  star_count: number;
  adoption_count: number;
  rating_count: number;
  rating_avg: number;
  quality_score: number;
  is_featured: boolean;
  is_starred: boolean;
  rank_score: number;
  source_track_id: string | null;
  created_at: string;
  published_at: string | null;
};

export type CatalogTrackDetail = CatalogTrack & {
  materials: {
    id: string;
    title: string;
    external_url: string | null;
    block_label: string | null;
    resource_type: string | null;
    estimated_minutes: number;
    sequence: number;
    resource_health_status: string;
    resource_quality_score: number;
  }[];
  quality: {
    quality_score: number;
    resource_score: number;
    quiz_count: number;
    project_count: number;
    practice_count: number;
    hard_count: number;
    module_count: number;
  };
};

export type CatalogCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tracks: CatalogTrack[];
};

export type CreatorProfile = {
  id: string;
  display_name: string | null;
  track_count: number;
  total_stars: number;
  total_adoptions: number;
  avg_rating: number;
  tracks: CatalogTrack[];
};

export type Leaderboards = {
  tracks: CatalogTrack[];
  creators: CreatorProfile[];
};

export type TrackAIUpdate = {
  id: string;
  track_id: string;
  status: string;
  added_materials: number;
  result: {
    summary?: string;
    materials?: GeneratedRoadmap["curriculum"]["tracks"][number]["materials"];
  } | null;
  error: string | null;
  created_at: string;
};

export type QueueItem = {
  card_id: string;
  material_id: string;
  material_title: string;
  material_content: string | null;
  material_url: string | null;
  block_label: string | null;
  resource_type: string | null;
  sequence: number;
  track_id: string;
  track_slug: string;
  track_name: string;
  track_color: string;
  state: string;
  due_at: string;
  priority_percent: number;
  estimated_minutes: number;
  cognitive_cost: number;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  kind: "review" | "new";
};

export type BlockEntry = {
  slot: number;
  slot_label: string;
  track_id: string;
  track_slug: string;
  track_name: string;
  track_color: string;
  block_minutes: number;
  planned_minutes: number;
  review_count: number;
  new_count: number;
  reviews: QueueItem[];
  new_items: QueueItem[];
};

export type DailyQueue = {
  weekday: number;
  block_minutes: number;
  blocks: BlockEntry[];
  items: QueueItem[];
  total_minutes: number;
  review_count: number;
  new_count: number;
};

export type BlockSession = {
  id: string;
  session_date: string;
  slot: number;
  slot_label: string;
  track_slug: string;
  track_name: string;
  track_color: string;
  planned_minutes: number;
  current_index: number;
  total_items: number;
  status: "IN_PROGRESS" | "COMPLETED";
  started_at: string;
  completed_at: string | null;
  items: QueueItem[];
  active_card_id: string | null;
};

export type TrackProgressBlock = {
  label: string;
  material_count: number;
  started_count: number;
  mastered_count: number;
};

export type TrackProgress = {
  track_id: string;
  slug: string;
  name: string;
  color: string;
  materials_total: number;
  materials_started: number;
  materials_mastered: number;
  due_reviews: number;
  avg_retrievability: number;
  next_material_id: string | null;
  next_material_title: string | null;
  next_material_url: string | null;
  next_block_label: string | null;
  blocks: TrackProgressBlock[];
};

export type Material = {
  id: string;
  track_id: string;
  title: string;
  raw_content: string | null;
  external_url: string | null;
  block_label: string | null;
  resource_type: string | null;
  sequence: number;
  cognitive_cost_multiplier: number;
  estimated_minutes: number;
  priority_percent: number;
  prerequisite_material_id: string | null;
  created_at: string;
  card_id: string | null;
  card_state: string | null;
  card_due_at: string | null;
};

export type CurriculumOverview = {
  version: string | null;
  total_materials: number;
  total_cards: number;
  total_started: number;
  total_mastered: number;
  due_reviews: number;
  weekly_schedule: WeeklySchedule | null;
  today_blocks: { block: number; track: string; track_name: string | null }[];
  tracks: {
    id: string;
    slug: string;
    name: string;
    color: string;
    description: string | null;
    material_count: number;
    card_count: number;
    started_count: number;
    mastered_count: number;
    due_review_count: number;
    next_material: string | null;
    next_block_label: string | null;
    blocks: {
      label: string;
      material_count: number;
      started_count: number;
      mastered_count: number;
      next_material: string | null;
      next_url: string | null;
    }[];
  }[];
};

export type CardDetail = {
  id: string;
  material_id: string;
  material_title: string;
  material_content: string | null;
  material_url: string | null;
  track_id: string;
  track_name: string;
  track_color: string;
  state: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  reps: number;
  lapses: number;
  due_at: string;
  last_reviewed_at: string | null;
  review_logs: {
    id: string;
    rating: string;
    elapsed_time_seconds: number;
    reviewed_at: string;
  }[];
};

export type Stats = {
  total_cards: number;
  due_cards: number;
  total_materials: number;
  total_tracks: number;
  reviews_today: number;
  reviews_this_week: number;
  reviews_total: number;
  retention_rate: number;
  current_streak: number;
  longest_streak: number;
  avg_review_seconds: number;
  materials_started: number;
  materials_mastered: number;
  sessions_this_week: number;
  days_active_30d: number;
  total_minutes_invested: number;
  minutes_today: number;
  daily_goal_minutes: number;
  track_breakdown: {
    track_id: string;
    track_name: string;
    track_color: string;
    material_count: number;
    card_count: number;
    due_count: number;
    reviews_total: number;
  }[];
};

export type ScheduleBlock = {
  block: number;
  track: string;
  track_name?: string | null;
  minutes?: number | null;
};

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WeeklySchedule = Record<WeekdayKey, ScheduleBlock[]>;

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  target_retention: number;
  daily_study_minutes: number;
  daily_new_cards: number;
  paused_tracks: string[];
  milestone_title: string | null;
  milestone_date: string | null;
  learning_goals: string | null;
  onboarded: boolean;
  created_at: string;
};

export type GeneratedRoadmap = {
  curriculum: {
    version?: string;
    tracks: {
      slug: string;
      name: string;
      description: string | null;
      color: string;
      cognitive_multiplier: number;
      materials: {
        title: string;
        url?: string | null;
        block_label?: string | null;
        type?: string | null;
        estimated_minutes: number;
        priority_percent: number;
        sequence: number;
        notes?: string | null;
      }[];
    }[];
    weekly_schedule: WeeklySchedule;
  };
  applied: boolean;
  stats: Record<string, number> | null;
  generation_id?: string | null;
};

export type RoadmapGenerationSummary = {
  id: string;
  title: string;
  goals: string;
  weekly_hours: number;
  level: string | null;
  track_count: number;
  applied: boolean;
  created_at: string;
};

export const api = {
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

  listRoadmapGenerations: () =>
    request<RoadmapGenerationSummary[]>("/curriculum/generations"),

  getRoadmapGeneration: (id: string) =>
    request<RoadmapGenerationSummary & { curriculum: GeneratedRoadmap["curriculum"] }>(
      `/curriculum/generations/${id}`
    ),

  deleteRoadmapGeneration: (id: string) =>
    request<void>(`/curriculum/generations/${id}`, { method: "DELETE" }),

  getTracks: () => request<Track[]>("/tracks"),
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

  getCatalogTracks: (params?: { q?: string; featured?: boolean; sort?: "ranking" | "stars" | "new"; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.featured) search.set("featured", "true");
    if (params?.sort) search.set("sort", params.sort);
    if (params?.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return request<CatalogTrack[]>(`/catalog/tracks${qs ? `?${qs}` : ""}`);
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
  getCatalogCollections: () => request<CatalogCollection[]>("/catalog/collections"),
  getCreatorProfile: (id: string) => request<CreatorProfile>(`/catalog/creators/${id}`),
  getLeaderboards: () => request<Leaderboards>("/catalog/leaderboards"),

  getMaterials: (trackId?: string) =>
    request<Material[]>(trackId ? `/materials?track_id=${trackId}` : "/materials"),
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

  getCards: (trackId?: string) =>
    request<CardDetail[]>(trackId ? `/cards?track_id=${trackId}` : "/cards"),
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
    request<{ card: { due_at: string; reps: number } }>(`/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, elapsed_time_seconds: elapsed }),
    }),

  getStats: () => request<Stats>("/stats"),
  getActivity: (days = 120) =>
    request<{ date: string; count: number }[]>(`/stats/activity?days=${days}`),
  getRetentionTimeline: (days = 30) =>
    request<{ date: string; retention: number; reviews: number }[]>(
      `/stats/retention-timeline?days=${days}`
    ),

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
  getTrackProgress: (slug: string) => request<TrackProgress>(`/tracks/slug/${slug}/progress`),
  getExtraQueue: (trackSlug: string, count = 5, excludeCardIds: string[] = []) => {
    const params = new URLSearchParams({ track: trackSlug, count: String(count) });
    for (const id of excludeCardIds) params.append("exclude", id);
    return request<QueueItem[]>(`/queue/extra?${params.toString()}`);
  },

  getAIStatus: () => request<{ enabled: boolean; provider: string; model: string }>("/chat/status"),
  listConversations: () =>
    request<{ id: string; title: string; created_at: string; updated_at: string; message_count: number }[]>(
      "/chat/conversations"
    ),
  createConversation: (title?: string) =>
    request<Conversation>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getConversation: (id: string) => request<Conversation>(`/chat/conversations/${id}`),
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

  getRecentSessions: (limit = 20) => request<StudySession[]>(`/sessions/recent?limit=${limit}`),

  getKnowledgeGraph: (slug: string) => request<KnowledgeGraph>(`/knowledge-graph/track/${slug}`),

  getLeeches: (limit = 20) => request<GraphNode[]>(`/knowledge-graph/leeches?limit=${limit}`),

  listOrganizations: () => request<Organization[]>(`/organizations`),

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
      // Omit email entirely when blank so the backend falls back to the
      // shared workspace password (an empty string fails EmailStr validation).
      body: JSON.stringify(email ? { email, password } : { password }),
    }),
};

export type CoachInsight = {
  kind: "DAILY" | "WEEKLY";
  period_key: string;
  content: string;
  metrics: Record<string, unknown> | null;
  provider: string;
  model: string;
  generated_at: string;
};

export type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  tool_calls: { id: string; name: string; input: Record<string, unknown> }[] | null;
  tool_results: { tool_use_id: string; name: string; result: unknown }[] | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type StudySession = {
  id: string;
  material_id: string;
  material_title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  completion_status: string;
  self_rating: number | null;
  notes: string | null;
  external_evidence_url: string | null;
  created_at: string;
};

export type GraphNode = {
  id: string;
  title: string;
  block_label: string | null;
  sequence: number;
  mastered: boolean;
  started: boolean;
  lapses: number;
  is_leech: boolean;
  card_id: string | null;
};

export type KnowledgeGraph = {
  track_slug: string;
  track_name: string;
  nodes: GraphNode[];
  edges: { source: string; target: string }[];
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  member_count: number;
};

export type AuthResponse = {
  auth_required: boolean;
  token: string | null;
  user_id: string | null;
  email: string | null;
};
