/**
 * Compound Frontend — TanStack Query hooks
 *
 * All hooks are grouped by feature area. Import from the specific module for
 * better tree-shaking, or from this barrel for convenience.
 */

// Today / Home
export * from "./useToday";

// Library / Syllabi
export * from "./useSyllabi";

// Studio / Course tree + roadmap
export * from "./useCourse";

// Explore / Catalog
export * from "./useExplore";

// Profile (user, stats, activity)
export * from "./useProfile";

// Session / Card review
export * from "./useSession";

// Block sessions
export * from "./useBlock";

// Auth / Login
export * from "./useAuth";

// Curriculum / Schedule
export * from "./useCurriculum";
