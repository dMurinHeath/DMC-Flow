/**
 * My Flow view-model derivation from prototype state.
 *
 * Task section ordering (stable, non-mutating):
 * 1. Priority: high, medium, low
 * 2. Due date: earliest valid YYYY-MM-DD first
 * 3. Tasks without a valid due date last
 * 4. Title (localeCompare)
 * 5. ID as final tie-breaker
 */
import type { Project, ProjectHealth } from "@/lib/domain/project";
import { isTaskBlocked, type Task } from "@/lib/domain/task";
import {
  dayToOrdinal,
  parseDateOnly,
  type CalendarDay,
} from "@/lib/domain/date-only";
import { compareTasks } from "./task-order";
import { PROTOTYPE_OWNER_ID, type PrototypeState } from "./types";

export type SummaryEmphasis = "teal" | "amber";

export type MyFlowSummaryItem = {
  label: string;
  value: string;
  emphasis: SummaryEmphasis;
};

export type MyFlowTaskRow = {
  id: string;
  title: string;
  project: string;
  due: string;
  ownerInitials: string;
};

export type MyFlowReviewItem = {
  id: string;
  title: string;
};

export type MyFlowProjectHealth = {
  id: string;
  name: string;
  status: "On track" | "Needs attention";
  emphasis: SummaryEmphasis;
};

export type MyFlowDashboardData = {
  eyebrow: string;
  heading: string;
  supportingText: string;
  summary: MyFlowSummaryItem[];
  nowTasks: MyFlowTaskRow[];
  nextTasks: MyFlowTaskRow[];
  nextTotalLabel: string;
  reviewQueue: MyFlowReviewItem[];
  projectHealth: MyFlowProjectHealth[];
};

export const MY_FLOW_COPY = {
  eyebrow: "MY FLOW",
  heading: "Good morning, Danilo",
  supportingText: "A clear view of what needs your attention.",
} as const;

export type BuildMyFlowDashboardOptions = {
  today: string;
};

function addDays(day: CalendarDay, offset: number): CalendarDay {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + offset, 12));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function weekdayName(day: CalendarDay): string {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day, 12));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}

function conciseDate(day: CalendarDay): string {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day, 12));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMyFlowDueLabel(
  dueDate: string | null,
  today: string,
): string {
  if (dueDate === null) {
    return "No due date";
  }

  const due = parseDateOnly(dueDate);
  const todayDay = parseDateOnly(today);
  if (!due || !todayDay) {
    return "Invalid date";
  }

  const offset = dayToOrdinal(due) - dayToOrdinal(todayDay);
  if (offset === 0) {
    return "Today";
  }
  if (offset === 1) {
    return "Tomorrow";
  }
  if (offset >= 2 && offset <= 6) {
    return weekdayName(due);
  }
  return conciseDate(due);
}

export function resolveOwnerInitials(ownerId: string | null): string {
  if (ownerId === PROTOTYPE_OWNER_ID) {
    return "DM";
  }
  return "—";
}

function projectNameById(
  projects: readonly Project[],
  projectId: string | null,
): string {
  if (projectId === null) {
    return "Unassigned";
  }
  const project = projects.find((candidate) => candidate.id === projectId);
  return project?.name ?? "Unassigned";
}

function sortTasks(tasks: readonly Task[]): Task[] {
  return tasks.map((task) => ({ ...task })).sort(compareTasks);
}

function toTaskRow(
  task: Task,
  projects: readonly Project[],
  today: string,
): MyFlowTaskRow {
  return {
    id: task.id,
    title: task.title,
    project: projectNameById(projects, task.projectId),
    due: formatMyFlowDueLabel(task.dueDate, today),
    ownerInitials: resolveOwnerInitials(task.ownerId),
  };
}

function healthPresentation(health: ProjectHealth): {
  status: MyFlowProjectHealth["status"];
  emphasis: SummaryEmphasis;
} {
  switch (health) {
    case "on_track":
      return { status: "On track", emphasis: "teal" };
    case "needs_attention":
      return { status: "Needs attention", emphasis: "amber" };
    default: {
      const _exhaustive: never = health;
      return _exhaustive;
    }
  }
}

export function buildMyFlowDashboard(
  state: PrototypeState,
  options: BuildMyFlowDashboardOptions,
): MyFlowDashboardData {
  const { today } = options;
  const inProgress = sortTasks(
    state.tasks.filter((task) => task.status === "in_progress"),
  );
  const ready = sortTasks(state.tasks.filter((task) => task.status === "ready"));
  const review = sortTasks(
    state.tasks.filter((task) => task.status === "review"),
  );
  const blockedCount = state.tasks.filter(
    (task) => task.status !== "done" && isTaskBlocked(task),
  ).length;

  const projectHealth = state.projects
    .filter((project) => project.archived === false)
    .map((project) => ({ ...project }))
    .sort((left, right) => {
      const nameDiff = left.name.localeCompare(right.name);
      if (nameDiff !== 0) {
        return nameDiff;
      }
      return left.id.localeCompare(right.id);
    })
    .map((project) => {
      const presentation = healthPresentation(project.health);
      return {
        id: project.id,
        name: project.name,
        status: presentation.status,
        emphasis: presentation.emphasis,
      };
    });

  return {
    ...MY_FLOW_COPY,
    summary: [
      { label: "Now", value: String(inProgress.length), emphasis: "teal" },
      { label: "Next", value: String(ready.length), emphasis: "teal" },
      { label: "Reviews", value: String(review.length), emphasis: "teal" },
      { label: "Blocked", value: String(blockedCount), emphasis: "amber" },
    ],
    nowTasks: inProgress.map((task) => toTaskRow(task, state.projects, today)),
    nextTasks: ready
      .slice(0, 2)
      .map((task) => toTaskRow(task, state.projects, today)),
    nextTotalLabel: `View all ${ready.length}`,
    reviewQueue: review.map((task) => ({ id: task.id, title: task.title })),
    projectHealth,
  };
}

/** Exported for tests that need a known calendar day after `today`. */
export function addCalendarDays(today: string, offset: number): string {
  const day = parseDateOnly(today);
  if (!day) {
    return today;
  }
  const next = addDays(day, offset);
  const month = String(next.month).padStart(2, "0");
  const date = String(next.day).padStart(2, "0");
  return `${next.year}-${month}-${date}`;
}
