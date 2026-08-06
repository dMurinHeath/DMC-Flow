import type { Project } from "@/lib/domain/project";
import {
  TASK_TITLE_MAX_LENGTH,
  canTransitionTaskStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain/task";
import { isValidDateOnly } from "./date-only";

export { isValidDateOnly } from "./date-only";

export const TASK_BLOCKED_REASON_MAX_LENGTH = 500;

export type TaskEditDraft = {
  title: string;
  projectId: string | null;
  priority: TaskPriority;
  ownerId: string | null;
  dueDate: string | null;
  blockedReason: string | null;
};

export type TaskEditIssue =
  | { field: "title"; code: "empty" | "too_long" }
  | { field: "dueDate"; code: "invalid" }
  | { field: "projectId"; code: "unknown" | "archived" }
  | { field: "blockedReason"; code: "too_long" };

export function validateTaskEdit(
  draft: TaskEditDraft,
  projects: readonly Project[],
  currentProjectId: string | null,
): TaskEditIssue[] {
  const issues: TaskEditIssue[] = [];
  const title = draft.title.trim();

  if (title.length === 0) {
    issues.push({ field: "title", code: "empty" });
  } else if (title.length > TASK_TITLE_MAX_LENGTH) {
    issues.push({ field: "title", code: "too_long" });
  }

  if (draft.dueDate !== null && !isValidDateOnly(draft.dueDate)) {
    issues.push({ field: "dueDate", code: "invalid" });
  }

  if (draft.projectId !== null) {
    const project = projects.find((candidate) => candidate.id === draft.projectId);
    if (!project) {
      issues.push({ field: "projectId", code: "unknown" });
    } else if (project.archived && draft.projectId !== currentProjectId) {
      issues.push({ field: "projectId", code: "archived" });
    }
  }

  const blocked =
    draft.blockedReason === null ? "" : draft.blockedReason.trim();
  if (blocked.length > TASK_BLOCKED_REASON_MAX_LENGTH) {
    issues.push({ field: "blockedReason", code: "too_long" });
  }

  return issues;
}

export function applyTaskEdit(
  task: Task,
  draft: TaskEditDraft,
  now: Date,
): Task {
  const blockedRaw =
    draft.blockedReason === null ? "" : draft.blockedReason.trim();
  return {
    ...task,
    title: draft.title.trim(),
    projectId: draft.projectId,
    priority: draft.priority,
    ownerId: draft.ownerId,
    dueDate: draft.dueDate,
    blockedReason: blockedRaw.length === 0 ? null : blockedRaw,
    updatedAt: now.toISOString(),
  };
}

export function applyStatusChange(
  task: Task,
  next: TaskStatus,
  now: Date,
): Task | null {
  if (!canTransitionTaskStatus(task.status, next)) {
    return null;
  }
  return {
    ...task,
    status: next,
    updatedAt: now.toISOString(),
  };
}
