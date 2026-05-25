/**
 * Determine the call-to-action label and visual style for a material based on
 * its `resource_type`. Keeps Practice / Watch / Read / Open visually distinct
 * so the user always knows the kind of work waiting on the other end of a link.
 */

export type ResourceKind =
  | "practice"
  | "video"
  | "reading"
  | "paper"
  | "course"
  | "project"
  | "tool";

export type ResourceAction = {
  label: string;
  shortLabel: string;
  className: string;
  icon: string;
  verb: string;
};

const ACTIONS: Record<ResourceKind, ResourceAction> = {
  practice: {
    label: "Practice now",
    shortLabel: "Practice",
    className: "btn-resource btn-practice",
    icon: "▷",
    verb: "Solve",
  },
  video: {
    label: "Watch now",
    shortLabel: "Watch",
    className: "btn-resource btn-watch",
    icon: "▶",
    verb: "Watch",
  },
  reading: {
    label: "Read now",
    shortLabel: "Read",
    className: "btn-resource btn-read",
    icon: "❡",
    verb: "Read",
  },
  paper: {
    label: "Read paper",
    shortLabel: "Paper",
    className: "btn-resource btn-paper",
    icon: "❡",
    verb: "Read",
  },
  course: {
    label: "Open course",
    shortLabel: "Course",
    className: "btn-resource btn-course",
    icon: "◐",
    verb: "Study",
  },
  project: {
    label: "Open project",
    shortLabel: "Project",
    className: "btn-resource btn-project",
    icon: "❯_",
    verb: "Build",
  },
  tool: {
    label: "Open",
    shortLabel: "Open",
    className: "btn-resource btn-open",
    icon: "↗",
    verb: "Open",
  },
};

const DEFAULT: ResourceAction = ACTIONS.practice;

export function resourceAction(type: string | null | undefined): ResourceAction {
  if (!type) return DEFAULT;
  const key = type.toLowerCase() as ResourceKind;
  return ACTIONS[key] ?? DEFAULT;
}
