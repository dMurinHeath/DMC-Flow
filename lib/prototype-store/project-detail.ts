import {
  isTaskBlocked,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain/task";
import type { Project } from "@/lib/domain/project";
import {
  formatMyFlowDueLabel,
  resolveOwnerInitials,
} from "./my-flow";
import { countOpenTasksForProject } from "./projects";
import { sortTasksBy, type TaskSortMode } from "./task-order";
import type { PrototypeState } from "./types";

export type ProjectTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due: string;
  ownerInitials: string;
  blocked: boolean;
};

export type ProjectDetailData = {
  project: Project;
  rows: ProjectTaskRow[];
  statusCounts: Record<TaskStatus, number>;
  totalCount: number;
  openCount: number;
};

export type ProjectDetailResult =
  | { ok: true; data: ProjectDetailData }
  | { ok: false; reason: "not_found" };

function emptyStatusCounts(): Record<TaskStatus, number> {
  return {
    inbox: 0,
    ready: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };
}

export function buildProjectDetail(
  state: PrototypeState,
  options: { projectId: string; today: string; sort: TaskSortMode },
): ProjectDetailResult {
  const project = state.projects.find(
    (candidate) => candidate.id === options.projectId,
  );
  if (!project) {
    return { ok: false, reason: "not_found" };
  }

  const matching = state.tasks.filter(
    (task) => task.projectId === options.projectId,
  );
  const sorted = sortTasksBy(matching, options.sort);
  const statusCounts = emptyStatusCounts();
  for (const status of TASK_STATUSES) {
    statusCounts[status] = matching.filter(
      (task) => task.status === status,
    ).length;
  }

  const rows: ProjectTaskRow[] = sorted.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due: formatMyFlowDueLabel(task.dueDate, options.today),
    ownerInitials: resolveOwnerInitials(task.ownerId),
    blocked: isTaskBlocked(task),
  }));

  return {
    ok: true,
    data: {
      project: { ...project },
      rows,
      statusCounts,
      totalCount: matching.length,
      openCount: countOpenTasksForProject(state.tasks, options.projectId),
    },
  };
}
