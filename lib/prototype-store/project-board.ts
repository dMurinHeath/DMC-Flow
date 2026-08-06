import type { Project } from "@/lib/domain/project";
import {
  canTransitionTaskStatus,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/domain/task";
import { applyStatusChange } from "@/lib/domain/task-edit";
import {
  buildProjectDetail,
  type ProjectTaskRow,
} from "./project-detail";
import { compareTasks } from "./task-order";
import type { PrototypeState } from "./types";

export type ProjectBoardColumn = {
  status: TaskStatus;
  rows: ProjectTaskRow[];
  count: number;
};

export type ProjectBoardData = {
  project: Project;
  columns: ProjectBoardColumn[];
  totalCount: number;
};

export type ProjectBoardResult =
  | { ok: true; data: ProjectBoardData }
  | { ok: false; reason: "not_found" };

const ALWAYS_VISIBLE: readonly TaskStatus[] = [
  "ready",
  "in_progress",
  "review",
  "done",
];

export function buildProjectBoard(
  state: PrototypeState,
  options: { projectId: string; today: string },
): ProjectBoardResult {
  const detail = buildProjectDetail(state, {
    projectId: options.projectId,
    today: options.today,
    sort: "default",
  });
  if (!detail.ok) {
    return detail;
  }

  const { project, rows, totalCount } = detail.data;
  const byStatus = new Map<TaskStatus, ProjectTaskRow[]>();
  for (const status of TASK_STATUSES) {
    byStatus.set(status, []);
  }
  for (const row of rows) {
    byStatus.get(row.status)!.push(row);
  }

  // Rows from buildProjectDetail are already compareTasks-ordered overall;
  // re-sort within each column to pin column order explicitly.
  const taskById = new Map(
    state.tasks
      .filter((task) => task.projectId === options.projectId)
      .map((task) => [task.id, task]),
  );

  const columns: ProjectBoardColumn[] = [];
  for (const status of TASK_STATUSES) {
    const columnRows = byStatus.get(status) ?? [];
    columnRows.sort((left, right) => {
      const leftTask = taskById.get(left.id);
      const rightTask = taskById.get(right.id);
      if (!leftTask || !rightTask) {
        return left.id.localeCompare(right.id);
      }
      return compareTasks(leftTask, rightTask);
    });

    const include =
      ALWAYS_VISIBLE.includes(status) || columnRows.length > 0;
    if (!include) {
      continue;
    }
    columns.push({
      status,
      rows: columnRows,
      count: columnRows.length,
    });
  }

  return {
    ok: true,
    data: {
      project,
      columns,
      totalCount,
    },
  };
}

export type BoardDropRefusal =
  | "unknown_task"
  | "wrong_project"
  | "same_status"
  | "not_permitted";

export type BoardDropResult =
  | { ok: true; task: Task }
  | { ok: false; reason: BoardDropRefusal; message: string };

export function resolveBoardDrop(input: {
  tasks: readonly Task[];
  taskId: string;
  projectId: string;
  targetStatus: TaskStatus;
  now: Date;
}): BoardDropResult {
  const task = input.tasks.find((candidate) => candidate.id === input.taskId);
  if (!task) {
    return {
      ok: false,
      reason: "unknown_task",
      message: "That task is no longer available.",
    };
  }

  if (task.projectId !== input.projectId) {
    return {
      ok: false,
      reason: "wrong_project",
      message: "That task no longer belongs to this project.",
    };
  }

  if (task.status === input.targetStatus) {
    return {
      ok: false,
      reason: "same_status",
      message: "That task is already in this column.",
    };
  }

  if (!canTransitionTaskStatus(task.status, input.targetStatus)) {
    return {
      ok: false,
      reason: "not_permitted",
      message: `Cannot move a ${task.status.replaceAll("_", " ")} task to ${input.targetStatus.replaceAll("_", " ")}.`,
    };
  }

  return {
    ok: true,
    task: applyStatusChange(task, input.targetStatus, input.now)!,
  };
}
