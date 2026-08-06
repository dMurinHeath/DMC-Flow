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
