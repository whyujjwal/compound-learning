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
  learning_outcomes: string[];
  prerequisites: string[];
  target_audience: string | null;
  estimated_hours: number | null;
  difficulty: string | null;
  syllabus_summary: string | null;
  modules: SyllabusModule[];
  material_count: number;
  due_card_count: number;
};

export type SyllabusMaterial = {
  id: string;
  module_id?: string | null;
  title: string;
  external_url: string | null;
  resource_type: string | null;
  estimated_minutes: number;
  sequence: number;
  difficulty: string | null;
  resource_quality_score?: number;
  resource_health_status?: string;
  card_state?: string | null;
};

export type SyllabusModule = {
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
  started_count?: number;
  mastered_count?: number;
  materials: SyllabusMaterial[];
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
  already_in_library: boolean;
  rank_score: number;
  source_track_id: string | null;
  learning_outcomes: string[];
  prerequisites: string[];
  target_audience: string | null;
  estimated_hours: number | null;
  difficulty: string | null;
  syllabus_summary: string | null;
  syllabus_preview: string[];
  created_at: string;
  published_at: string | null;
};

export type CatalogTrackDetail = CatalogTrack & {
  materials: {
    id: string;
    module_id: string | null;
    title: string;
    external_url: string | null;
    block_label: string | null;
    resource_type: string | null;
    difficulty: string | null;
    estimated_minutes: number;
    sequence: number;
    resource_health_status: string;
    resource_quality_score: number;
  }[];
  modules: SyllabusModule[];
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
  modules: SyllabusModule[];
};

export type Material = {
  id: string;
  track_id: string;
  module_id: string | null;
  title: string;
  raw_content: string | null;
  external_url: string | null;
  block_label: string | null;
  resource_type: string | null;
  difficulty: string | null;
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
      learning_outcomes?: string[];
      prerequisites?: string[];
      target_audience?: string | null;
      estimated_hours?: number | null;
      difficulty?: string | null;
      syllabus_summary?: string | null;
      modules?: {
        title: string;
        description?: string | null;
        objective?: string | null;
        sequence?: number;
        estimated_minutes?: number;
        difficulty?: string | null;
        quiz_prompt?: string | null;
        project_prompt?: string | null;
      }[];
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
