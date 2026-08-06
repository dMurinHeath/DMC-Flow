import {
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain/task";

export const TASK_SORT_MODES = [
  "default",
  "status",
  "priority",
  "due",
  "title",
] as const;

export type TaskSortMode = (typeof TASK_SORT_MODES)[number];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

function parseDateOnly(value: string): CalendarDay | null {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function dayToOrdinal(day: CalendarDay): number {
  return Math.floor(
    Date.UTC(day.year, day.month - 1, day.day) / (24 * 60 * 60 * 1000),
  );
}

export function compareTasks(left: Task, right: Task): number {
  const priorityDiff =
    PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftDue = left.dueDate ? parseDateOnly(left.dueDate) : null;
  const rightDue = right.dueDate ? parseDateOnly(right.dueDate) : null;
  if (leftDue && rightDue) {
    const dueDiff = dayToOrdinal(leftDue) - dayToOrdinal(rightDue);
    if (dueDiff !== 0) {
      return dueDiff;
    }
  } else if (leftDue && !rightDue) {
    return -1;
  } else if (!leftDue && rightDue) {
    return 1;
  }

  const titleDiff = left.title.localeCompare(right.title);
  if (titleDiff !== 0) {
    return titleDiff;
  }
  return left.id.localeCompare(right.id);
}

const STATUS_RANK: Record<TaskStatus, number> = Object.fromEntries(
  TASK_STATUSES.map((status, index) => [status, index]),
) as Record<TaskStatus, number>;

function compareByDue(left: Task, right: Task): number {
  const leftDue = left.dueDate ? parseDateOnly(left.dueDate) : null;
  const rightDue = right.dueDate ? parseDateOnly(right.dueDate) : null;
  if (leftDue && rightDue) {
    return dayToOrdinal(leftDue) - dayToOrdinal(rightDue);
  }
  if (leftDue && !rightDue) {
    return -1;
  }
  if (!leftDue && rightDue) {
    return 1;
  }
  return 0;
}

export function sortTasksBy(
  tasks: readonly Task[],
  mode: TaskSortMode,
): Task[] {
  const copy = tasks.map((task) => ({ ...task }));

  copy.sort((left, right) => {
    let primary = 0;
    switch (mode) {
      case "default":
        return compareTasks(left, right);
      case "status":
        primary = STATUS_RANK[left.status] - STATUS_RANK[right.status];
        break;
      case "priority":
        primary = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
        break;
      case "due":
        primary = compareByDue(left, right);
        break;
      case "title":
        primary = left.title.localeCompare(right.title);
        break;
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
    if (primary !== 0) {
      return primary;
    }
    return compareTasks(left, right);
  });

  return copy;
}
