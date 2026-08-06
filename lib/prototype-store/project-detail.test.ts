// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/domain/task";
import { TASK_STATUSES } from "@/lib/domain/task";
import { buildProjectDetail } from "./project-detail";
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

describe("buildProjectDetail", () => {
  it("returns not_found for an unknown id", () => {
    const result = buildProjectDetail(createPrototypeSeedState(), {
      projectId: "does-not-exist",
      today: TODAY,
      sort: "default",
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("includes only matching project tasks and full statusCounts", () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeTask({
        id: "task-unassigned",
        title: "Unassigned",
        status: "inbox",
        projectId: null,
      }),
      makeTask({
        id: "task-other",
        title: "Other project",
        status: "ready",
        projectId: PROJECT_ID_CLOUD_PLATFORM,
      }),
    );

    const result = buildProjectDetail(state, {
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      today: TODAY,
      sort: "default",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      result.data.rows.every((row) =>
        state.tasks.some(
          (task) =>
            task.id === row.id && task.projectId === PROJECT_ID_DMC_FLOW_PILOT,
        ),
      ),
    ).toBe(true);
    expect(result.data.rows.some((row) => row.id === "task-unassigned")).toBe(
      false,
    );
    expect(result.data.rows.some((row) => row.id === "task-other")).toBe(false);

    for (const status of TASK_STATUSES) {
      expect(result.data.statusCounts).toHaveProperty(status);
    }
    const counted = Object.values(result.data.statusCounts).reduce(
      (sum, value) => sum + value,
      0,
    );
    expect(counted).toBe(result.data.totalCount);
    expect(result.data.totalCount).toBe(
      state.tasks.filter(
        (task) => task.projectId === PROJECT_ID_DMC_FLOW_PILOT,
      ).length,
    );
  });

  it("returns empty rows and zero counts for a project with no tasks", () => {
    const state = createPrototypeSeedState();
    state.projects.push({
      id: "proj-empty",
      name: "Empty",
      description: "",
      health: "on_track",
      archived: false,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });

    const result = buildProjectDetail(state, {
      projectId: "proj-empty",
      today: TODAY,
      sort: "default",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.rows).toEqual([]);
    expect(result.data.totalCount).toBe(0);
    expect(result.data.openCount).toBe(0);
    expect(result.data.statusCounts).toEqual({
      inbox: 0,
      ready: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    });
  });
});
