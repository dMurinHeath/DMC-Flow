// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/domain/task";
import { TASK_STATUSES } from "@/lib/domain/task";
import { compareTasks } from "./task-order";
import {
  buildProjectBoard,
  resolveBoardDrop,
} from "./project-board";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "./seed";
import { PROTOTYPE_OWNER_ID } from "./types";

const TODAY = "2026-08-06";
const NOW = new Date("2026-08-06T17:00:00.000Z");

function makeTask(
  partial: Partial<Task> & Pick<Task, "id" | "title" | "status">,
): Task {
  return {
    projectId: PROJECT_ID_DMC_FLOW_PILOT,
    priority: "medium",
    ownerId: PROTOTYPE_OWNER_ID,
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...partial,
  };
}

describe("buildProjectBoard", () => {
  it("returns not_found for an unknown id", () => {
    expect(
      buildProjectBoard(createPrototypeSeedState(), {
        projectId: "missing",
        today: TODAY,
      }),
    ).toEqual({ ok: false, reason: "not_found" });
  });

  it("keeps ready/in_progress/review/done always and omits empty inbox", () => {
    const result = buildProjectBoard(createPrototypeSeedState(), {
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.columns.map((column) => column.status)).toEqual([
      "ready",
      "in_progress",
      "review",
      "done",
    ]);
    expect(
      result.data.columns.every((column) =>
        ["ready", "in_progress", "review", "done"].includes(column.status),
      ),
    ).toBe(true);
  });

  it("includes inbox when a project task is in inbox", () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeTask({
        id: "task-inbox-assigned",
        title: "Inbox in project",
        status: "inbox",
      }),
    );
    const result = buildProjectBoard(state, {
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.columns.map((column) => column.status)).toEqual([
      "inbox",
      "ready",
      "in_progress",
      "review",
      "done",
    ]);
  });

  it("places every project task in exactly one column", () => {
    const state = createPrototypeSeedState();
    const result = buildProjectBoard(state, {
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const ids = result.data.columns.flatMap((column) =>
      column.rows.map((row) => row.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(result.data.totalCount);
    expect(
      result.data.columns.reduce((sum, column) => sum + column.count, 0),
    ).toBe(result.data.totalCount);
    expect(result.data.totalCount).toBe(
      state.tasks.filter(
        (task) => task.projectId === PROJECT_ID_DMC_FLOW_PILOT,
      ).length,
    );
  });

  it("orders rows within a column by compareTasks", () => {
    const state = createPrototypeSeedState();
    const ready = state.tasks.filter(
      (task) =>
        task.projectId === PROJECT_ID_DMC_FLOW_PILOT && task.status === "ready",
    );
    const expected = [...ready].sort(compareTasks).map((task) => task.id);
    const result = buildProjectBoard(state, {
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const column = result.data.columns.find(
      (candidate) => candidate.status === "ready",
    );
    expect(column?.rows.map((row) => row.id)).toEqual(expected);
  });

  it("renders a board with a task in every status including inbox", () => {
    const state = createPrototypeSeedState();
    state.tasks = TASK_STATUSES.map((status, index) =>
      makeTask({
        id: `task-every-${status}`,
        title: `Every ${status}`,
        status,
        priority: index === 0 ? "high" : "medium",
      }),
    );
    const result = buildProjectBoard(state, {
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const rendered = result.data.columns.flatMap((column) =>
      column.rows.map((row) => row.id),
    );
    for (const status of TASK_STATUSES) {
      expect(rendered).toContain(`task-every-${status}`);
    }
    expect(result.data.columns.map((column) => column.status)).toEqual([
      ...TASK_STATUSES,
    ]);
  });
});

describe("resolveBoardDrop", () => {
  const seed = createPrototypeSeedState();
  const ready = seed.tasks.find(
    (task) =>
      task.projectId === PROJECT_ID_DMC_FLOW_PILOT && task.status === "ready",
  )!;

  it("refuses unknown, wrong project, same status, and ready -> done", () => {
    expect(
      resolveBoardDrop({
        tasks: seed.tasks,
        taskId: "missing",
        projectId: PROJECT_ID_DMC_FLOW_PILOT,
        targetStatus: "in_progress",
        now: NOW,
      }).ok,
    ).toBe(false);

    const foreign = seed.tasks.find(
      (task) => task.projectId === PROJECT_ID_CLOUD_PLATFORM,
    )!;
    const wrong = resolveBoardDrop({
      tasks: seed.tasks,
      taskId: foreign.id,
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      targetStatus: "in_progress",
      now: NOW,
    });
    expect(wrong).toMatchObject({ ok: false, reason: "wrong_project" });

    expect(
      resolveBoardDrop({
        tasks: seed.tasks,
        taskId: ready.id,
        projectId: PROJECT_ID_DMC_FLOW_PILOT,
        targetStatus: "ready",
        now: NOW,
      }),
    ).toMatchObject({ ok: false, reason: "same_status" });

    expect(
      resolveBoardDrop({
        tasks: seed.tasks,
        taskId: ready.id,
        projectId: PROJECT_ID_DMC_FLOW_PILOT,
        targetStatus: "done",
        now: NOW,
      }),
    ).toMatchObject({ ok: false, reason: "not_permitted" });
  });

  it("accepts ready -> in_progress changing only status and updatedAt", () => {
    const result = resolveBoardDrop({
      tasks: seed.tasks,
      taskId: ready.id,
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      targetStatus: "in_progress",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.task).toEqual({
      ...ready,
      status: "in_progress",
      updatedAt: NOW.toISOString(),
    });
  });
});
