export const TASK_TITLE_MAX_LENGTH = 200;

export type TaskDraft = {
  title: string;
};

export type TaskDraftIssueCode = "required" | "invalid_type" | "too_long";

export type TaskDraftIssue = {
  field: "title";
  code: TaskDraftIssueCode;
  message: string;
};

export type TaskDraftResult =
  | { ok: true; value: TaskDraft }
  | { ok: false; issues: TaskDraftIssue[] };

export const TASK_STATUSES = [
  "inbox",
  "ready",
  "in_progress",
  "review",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_RISK_ROUTES = [
  "standard",
  "controlled",
  "restricted",
] as const;

export type TaskRiskRoute = (typeof TASK_RISK_ROUTES)[number];

export type Task = {
  id: string;
  title: string;
  projectId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId: string | null;
  dueDate: string | null;
  riskRoute: TaskRiskRoute;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

const ALLOWED_TASK_STATUS_TRANSITIONS: ReadonlySet<string> = new Set([
  "inbox>ready",
  "ready>in_progress",
  "in_progress>ready",
  "in_progress>review",
  "review>in_progress",
  "review>done",
  "done>in_progress",
]);

function issue(
  code: TaskDraftIssueCode,
  message: string,
): TaskDraftIssue {
  return { field: "title", code, message };
}

function fail(code: TaskDraftIssueCode, message: string): TaskDraftResult {
  return { ok: false, issues: [issue(code, message)] };
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function includesValue<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return includesValue(TASK_STATUSES, value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return includesValue(TASK_PRIORITIES, value);
}

export function isTaskRiskRoute(value: unknown): value is TaskRiskRoute {
  return includesValue(TASK_RISK_ROUTES, value);
}

export function isTaskBlocked(task: Pick<Task, "blockedReason">): boolean {
  return (
    typeof task.blockedReason === "string" &&
    task.blockedReason.trim().length > 0
  );
}

export function canTransitionTaskStatus(
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  if (from === to) {
    return false;
  }

  return ALLOWED_TASK_STATUS_TRANSITIONS.has(`${from}>${to}`);
}

export function parseTaskDraft(input: unknown): TaskDraftResult {
  if (!isPlainObject(input)) {
    return fail("invalid_type", "Task draft must be an object with a title.");
  }

  if (!("title" in input) || input.title === undefined) {
    return fail("required", "Title is required.");
  }

  if (typeof input.title !== "string") {
    return fail("invalid_type", "Title must be a string.");
  }

  const title = input.title.trim();

  if (title.length === 0) {
    return fail("required", "Title is required.");
  }

  if (title.length > TASK_TITLE_MAX_LENGTH) {
    return fail(
      "too_long",
      `Title must be at most ${TASK_TITLE_MAX_LENGTH} characters.`,
    );
  }

  return { ok: true, value: { title } };
}
