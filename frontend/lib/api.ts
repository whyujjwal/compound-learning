import { getAuthToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const { clearAuthToken } = await import("./auth");
      clearAuthToken();
      window.location.href = "/login";
      throw new Error("Session expired — please sign in again");
    }
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? JSON.stringify(body);
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
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
  material_count: number;
  due_card_count: number;
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
  weekly_schedule: Record<string, { block: number; track: string }[]> | null;
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

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  target_retention: number;
  daily_study_minutes: number;
  paused_tracks: string[];
  milestone_title: string | null;
  milestone_date: string | null;
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
        | "paused_tracks"
        | "display_name"
        | "milestone_title"
        | "milestone_date"
      >
    >
  ) => request<User>("/user/me", { method: "PATCH", body: JSON.stringify(data) }),

  getTracks: () => request<Track[]>("/tracks"),
  getTrack: (id: string) => request<Track>(`/tracks/${id}`),
  createTrack: (data: {
    slug: string;
    name: string;
    description?: string;
    color?: string;
    cognitive_multiplier?: number;
  }) => request<Track>("/tracks", { method: "POST", body: JSON.stringify(data) }),
  updateTrack: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
      cognitive_multiplier: number;
    }>
  ) => request<Track>(`/tracks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTrack: (id: string) => request<void>(`/tracks/${id}`, { method: "DELETE" }),

  getMaterials: (trackId?: string) =>
    request<Material[]>(trackId ? `/materials?track_id=${trackId}` : "/materials"),
  getMaterial: (id: string) => request<Material>(`/materials/${id}`),
  createMaterial: (data: {
    track_id: string;
    title: string;
    raw_content?: string;
    external_url?: string;
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
  getWeeklySchedule: () => request<Record<string, { block: number; track: string }[]>>("/curriculum/schedule"),
  getTodaySchedule: () =>
    request<{ block: number; track: string; track_name: string | null }[]>("/curriculum/schedule/today"),
  importCurriculum: () => request<Record<string, number>>("/curriculum/import/default", { method: "POST" }),
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

  loginWithEmail: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
