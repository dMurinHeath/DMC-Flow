// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  TASK_PRIORITIES,
  TASK_RISK_ROUTES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
  canTransitionTaskStatus,
  allowedTransitions,
  isTask,
  isTaskBlocked,
  isTaskPriority,
  isTaskRiskRoute,
  isTaskStatus,
  parseTaskDraft,
  type Task,
  type TaskStatus,
} from "./task";

const validTask: Task = {
  id: "task-1",
  title: "Approve Flow Gate specification",
  projectId: "proj-dmc-flow-pilot",
  status: "in_progress",
  priority: "high",
  ownerId: "user-dm",
  dueDate: "2026-08-06",
  riskRoute: "controlled",
  blockedReason: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

describe("parseTaskDraft", () => {
  it("accepts a normal valid title", () => {
    const result = parseTaskDraft({ title: "Approve Flow Gate specification" });
    expect(result).toEqual({
      ok: true,
      value: { title: "Approve Flow Gate specification" },
    });
  });

  it("trims surrounding whitespace", () => {
    const result = parseTaskDraft({ title: "  Capture title  " });
    expect(result).toEqual({
      ok: true,
      value: { title: "Capture title" },
    });
  });

  it("preserves meaningful internal whitespace", () => {
    const result = parseTaskDraft({ title: "Define  acceptance  criteria" });
    expect(result).toEqual({
      ok: true,
      value: { title: "Define  acceptance  criteria" },
    });
  });

  it("rejects null, arrays and primitive non-object inputs", () => {
    for (const input of [null, ["title"], "title", 42, true, undefined]) {
      const result = parseTaskDraft(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toEqual([
          expect.objectContaining({
            field: "title",
            code: "invalid_type",
          }),
        ]);
      }
    }
  });

  it("rejects an object with no title", () => {
    const result = parseTaskDraft({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "required" }),
      ]);
    }
  });

  it("rejects a non-string title", () => {
    const result = parseTaskDraft({ title: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "invalid_type" }),
      ]);
    }
  });

  it("rejects an empty title", () => {
    const result = parseTaskDraft({ title: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "required" }),
      ]);
    }
  });

  it("rejects a whitespace-only title", () => {
    const result = parseTaskDraft({ title: "   \t  " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "required" }),
      ]);
    }
  });

  it("accepts a title at the exact maximum length and rejects one character above", () => {
    const atMax = "a".repeat(TASK_TITLE_MAX_LENGTH);
    const overMax = "a".repeat(TASK_TITLE_MAX_LENGTH + 1);

    expect(parseTaskDraft({ title: atMax })).toEqual({
      ok: true,
      value: { title: atMax },
    });

    const overResult = parseTaskDraft({ title: overMax });
    expect(overResult.ok).toBe(false);
    if (!overResult.ok) {
      expect(overResult.issues).toEqual([
        expect.objectContaining({ field: "title", code: "too_long" }),
      ]);
    }
  });

  it("returns stable issue field and code values", () => {
    const result = parseTaskDraft({ title: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.field).toBe("title");
      expect(result.issues[0]?.code).toBe("invalid_type");
      expect(typeof result.issues[0]?.message).toBe("string");
    }
  });

  it("does not mutate the supplied input", () => {
    const input = { title: "  Keep input unchanged  " };
    const snapshot = structuredClone(input);
    parseTaskDraft(input);
    expect(input).toEqual(snapshot);
  });
});

describe("task status transitions", () => {
  const permittedPairs: Array<[TaskStatus, TaskStatus]> = [
    ["inbox", "ready"],
    ["ready", "in_progress"],
    ["in_progress", "ready"],
    ["in_progress", "review"],
    ["review", "in_progress"],
    ["review", "done"],
    ["done", "in_progress"],
  ];

  const rejectedTransitions: Array<[TaskStatus, TaskStatus]> = [
    ["inbox", "inbox"],
    ["ready", "ready"],
    ["in_progress", "in_progress"],
    ["review", "review"],
    ["done", "done"],
    ["inbox", "done"],
    ["inbox", "in_progress"],
    ["ready", "review"],
    ["ready", "done"],
    ["done", "ready"],
    ["done", "review"],
    ["done", "inbox"],
    ["review", "ready"],
    ["review", "inbox"],
  ];

  it("allows every approved transition and rejects representative illegal transitions including same-status", () => {
    for (const [from, to] of permittedPairs) {
      expect(canTransitionTaskStatus(from, to)).toBe(true);
    }

    for (const [from, to] of rejectedTransitions) {
      expect(canTransitionTaskStatus(from, to)).toBe(false);
    }
  });

  it("allows reopening a completed task to in_progress", () => {
    expect(canTransitionTaskStatus("done", "in_progress")).toBe(true);
  });

  it("lists permitted next statuses via allowedTransitions helper", () => {
    for (const from of TASK_STATUSES) {
      const listed = allowedTransitions(from);
      for (const to of TASK_STATUSES) {
        expect(listed.includes(to)).toBe(canTransitionTaskStatus(from, to));
      }
    }
  });
});

describe("isTaskBlocked", () => {
  it("treats blocked state as independent of task status", () => {
    expect(TASK_STATUSES).toContain("in_progress");
    expect(
      isTaskBlocked({
        blockedReason: "Waiting on security review",
      }),
    ).toBe(true);
    expect(isTaskBlocked({ blockedReason: null })).toBe(false);
    expect(isTaskBlocked({ blockedReason: "   " })).toBe(false);
    expect(isTaskBlocked({ blockedReason: "" })).toBe(false);
  });
});

describe("task closed values and guards", () => {
  it("exposes the exact priority values", () => {
    expect([...TASK_PRIORITIES]).toEqual(["low", "medium", "high"]);
  });

  it("exposes the exact risk-route values", () => {
    expect([...TASK_RISK_ROUTES]).toEqual([
      "standard",
      "controlled",
      "restricted",
    ]);
  });

  it("accepts supported status, priority and risk values and rejects unknown strings", () => {
    for (const status of TASK_STATUSES) {
      expect(isTaskStatus(status)).toBe(true);
    }
    expect(isTaskStatus("blocked")).toBe(false);
    expect(isTaskStatus(1)).toBe(false);

    for (const priority of TASK_PRIORITIES) {
      expect(isTaskPriority(priority)).toBe(true);
    }
    expect(isTaskPriority("urgent")).toBe(false);

    for (const route of TASK_RISK_ROUTES) {
      expect(isTaskRiskRoute(route)).toBe(true);
    }
    expect(isTaskRiskRoute("elevated")).toBe(false);
  });
});

describe("isTask", () => {
  it("accepts a structurally valid task", () => {
    expect(isTask(validTask)).toBe(true);
    expect(isTask({ ...validTask, projectId: null, ownerId: null })).toBe(true);
  });

  it("rejects unknown shapes and invalid field values", () => {
    expect(isTask(null)).toBe(false);
    expect(isTask([])).toBe(false);
    expect(isTask({ ...validTask, status: "blocked" })).toBe(false);
    expect(isTask({ ...validTask, title: "   " })).toBe(false);
    expect(
      isTask({ ...validTask, title: "a".repeat(TASK_TITLE_MAX_LENGTH + 1) }),
    ).toBe(false);
    expect(isTask({ ...validTask, priority: "urgent" })).toBe(false);
  });
});
