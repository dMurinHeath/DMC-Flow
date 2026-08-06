import {
  allowedTransitions,
  isTaskBlocked,
  type Task,
  type TaskStatus,
} from "@/lib/domain/task";
import {
  formatMyFlowDueLabel,
  resolveOwnerInitials,
} from "./my-flow";
import type { PrototypeState } from "./types";

export type TaskDetailData = {
  task: Task;
  projectId: string | null;
  projectName: string | null;
  projectArchived: boolean;
  dueLabel: string;
  ownerInitials: string;
  blocked: boolean;
  allowedNext: TaskStatus[];
};

export type TaskDetailResult =
  | { ok: true; data: TaskDetailData }
  | { ok: false; reason: "not_found" };

export function buildTaskDetail(
  state: PrototypeState,
  options: { taskId: string; today: string },
): TaskDetailResult {
  const task = state.tasks.find((candidate) => candidate.id === options.taskId);
  if (!task) {
    return { ok: false, reason: "not_found" };
  }

  const project =
    task.projectId === null
      ? null
      : (state.projects.find((candidate) => candidate.id === task.projectId) ??
        null);

  return {
    ok: true,
    data: {
      task: { ...task },
      projectId: task.projectId,
      projectName: project ? project.name : null,
      projectArchived: project ? project.archived : false,
      dueLabel: formatMyFlowDueLabel(task.dueDate, options.today),
      ownerInitials: resolveOwnerInitials(task.ownerId),
      blocked: isTaskBlocked(task),
      allowedNext: allowedTransitions(task.status),
    },
  };
}
