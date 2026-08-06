// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/domain/task";
import { allowedTransitions } from "@/lib/domain/task";
import { buildTaskDetail } from "./task-detail";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "./seed";
import { PROTOTYPE_OWNER_ID } from "./types";

const TODAY = "2026-08-06";

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

describe("buildTaskDetail", () => {
  it("returns not_found for an unknown taskId", () => {
    const result = buildTaskDetail(createPrototypeSeedState(), {
      taskId: "does-not-exist",
      today: TODAY,
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns null project fields and projectArchived false for an unassigned task", () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeTask({
        id: "task-unassigned",
        title: "Unassigned",
        status: "inbox",
        projectId: null,
      }),
    );

    const result = buildTaskDetail(state, {
      taskId: "task-unassigned",
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.projectId).toBeNull();
    expect(result.data.projectName).toBeNull();
    expect(result.data.projectArchived).toBe(false);
  });

  it("returns projectArchived true for a task in an archived project", () => {
    const state = createPrototypeSeedState();
    const archived = state.projects.find(
      (project) => project.id === PROJECT_ID_CLOUD_PLATFORM,
    );
    expect(archived).toBeDefined();
    archived!.archived = true;

    state.tasks.push(
      makeTask({
        id: "task-archived-project",
        title: "Archived project task",
        status: "ready",
        projectId: PROJECT_ID_CLOUD_PLATFORM,
      }),
    );

    const result = buildTaskDetail(state, {
      taskId: "task-archived-project",
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.projectId).toBe(PROJECT_ID_CLOUD_PLATFORM);
    expect(result.data.projectArchived).toBe(true);
  });

  it('uses "No due date" for null and a safe fallback for an unparseable due date', () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeTask({
        id: "task-no-due",
        title: "No due",
        status: "ready",
        dueDate: null,
      }),
      makeTask({
        id: "task-bad-due",
        title: "Bad due",
        status: "ready",
        dueDate: "not-a-date",
      }),
    );

    const noDue = buildTaskDetail(state, {
      taskId: "task-no-due",
      today: TODAY,
    });
    expect(noDue.ok).toBe(true);
    if (noDue.ok) {
      expect(noDue.data.dueLabel).toBe("No due date");
    }

    const badDue = buildTaskDetail(state, {
      taskId: "task-bad-due",
      today: TODAY,
    });
    expect(badDue.ok).toBe(true);
    if (badDue.ok) {
      expect(badDue.data.dueLabel).toBe("Invalid date");
    }
  });

  it("sets allowedNext from allowedTransitions so Ready never offers Done", () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeTask({
        id: "task-ready",
        title: "Ready task",
        status: "ready",
      }),
    );

    const result = buildTaskDetail(state, {
      taskId: "task-ready",
      today: TODAY,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.allowedNext).toEqual(allowedTransitions("ready"));
    expect(result.data.allowedNext).not.toContain("done");
  });
});
