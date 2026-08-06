// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/domain/project";
import {
  TASK_TITLE_MAX_LENGTH,
  allowedTransitions,
  type Task,
} from "@/lib/domain/task";
import {
  TASK_BLOCKED_REASON_MAX_LENGTH,
  applyStatusChange,
  applyTaskEdit,
  validateTaskEdit,
  type TaskEditDraft,
} from "./task-edit";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "@/lib/prototype-store/seed";
import { buildMyFlowDashboard } from "@/lib/prototype-store/my-flow";

const NOW = new Date("2026-08-06T15:00:00.000Z");

const baseTask: Task = {
  id: "task-1",
  title: "Editable task",
  projectId: PROJECT_ID_DMC_FLOW_PILOT,
  status: "in_progress",
  priority: "high",
  ownerId: "user-dm",
  dueDate: "2026-08-06",
  riskRoute: "standard",
  blockedReason: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

function draft(partial: Partial<TaskEditDraft> = {}): TaskEditDraft {
  return {
    title: "Editable task",
    projectId: PROJECT_ID_DMC_FLOW_PILOT,
    priority: "high",
    ownerId: "user-dm",
    dueDate: "2026-08-06",
    blockedReason: null,
    ...partial,
  };
}

describe("allowedTransitions", () => {
  it("returns only transitions permitted by canTransitionTaskStatus", () => {
    expect(allowedTransitions("inbox")).toEqual(["ready"]);
    expect(allowedTransitions("ready")).toEqual(["in_progress"]);
    expect(allowedTransitions("in_progress")).toEqual(["ready", "review"]);
    expect(allowedTransitions("review")).toEqual(["in_progress", "done"]);
    expect(allowedTransitions("done")).toEqual(["in_progress"]);
  });
});

describe("validateTaskEdit", () => {
  const projects = createPrototypeSeedState().projects;

  it("rejects blank, whitespace-only and over-long titles", () => {
    expect(validateTaskEdit(draft({ title: "" }), projects)).toEqual([
      { field: "title", code: "empty" },
    ]);
    expect(validateTaskEdit(draft({ title: "   " }), projects)).toEqual([
      { field: "title", code: "empty" },
    ]);
    expect(
      validateTaskEdit(
        draft({ title: "a".repeat(TASK_TITLE_MAX_LENGTH + 1) }),
        projects,
      ),
    ).toEqual([{ field: "title", code: "too_long" }]);
  });

  it("rejects invalid due dates and bad projects", () => {
    expect(validateTaskEdit(draft({ dueDate: "06-08-2026" }), projects)).toEqual(
      [{ field: "dueDate", code: "invalid" }],
    );
    expect(
      validateTaskEdit(draft({ projectId: "proj-missing" }), projects),
    ).toEqual([{ field: "projectId", code: "unknown" }]);

    const withArchived: Project[] = projects.map((project) =>
      project.id === PROJECT_ID_CLOUD_PLATFORM
        ? { ...project, archived: true }
        : project,
    );
    expect(
      validateTaskEdit(
        draft({ projectId: PROJECT_ID_CLOUD_PLATFORM }),
        withArchived,
      ),
    ).toEqual([{ field: "projectId", code: "archived" }]);
  });

  it("accepts null project, owner and due date", () => {
    expect(
      validateTaskEdit(
        draft({ projectId: null, ownerId: null, dueDate: null }),
        projects,
      ),
    ).toEqual([]);
  });

  it("rejects an over-long blocked reason", () => {
    expect(
      validateTaskEdit(
        draft({
          blockedReason: "x".repeat(TASK_BLOCKED_REASON_MAX_LENGTH + 1),
        }),
        projects,
      ),
    ).toEqual([{ field: "blockedReason", code: "too_long" }]);
  });
});

describe("applyTaskEdit", () => {
  it("updates mutable fields and updatedAt without changing id or createdAt", () => {
    const next = applyTaskEdit(
      baseTask,
      draft({
        title: "  Renamed  ",
        priority: "low",
        projectId: PROJECT_ID_CLOUD_PLATFORM,
        ownerId: null,
        dueDate: null,
        blockedReason: "  Waiting  ",
      }),
      NOW,
    );

    expect(next.id).toBe(baseTask.id);
    expect(next.createdAt).toBe(baseTask.createdAt);
    expect(next.status).toBe(baseTask.status);
    expect(next.riskRoute).toBe(baseTask.riskRoute);
    expect(next.title).toBe("Renamed");
    expect(next.priority).toBe("low");
    expect(next.projectId).toBe(PROJECT_ID_CLOUD_PLATFORM);
    expect(next.ownerId).toBeNull();
    expect(next.dueDate).toBeNull();
    expect(next.blockedReason).toBe("Waiting");
    expect(next.updatedAt).toBe(NOW.toISOString());
  });

  it("normalises a blank blockedReason to null", () => {
    const next = applyTaskEdit(
      { ...baseTask, blockedReason: "Was blocked" },
      draft({ blockedReason: "   " }),
      NOW,
    );
    expect(next.blockedReason).toBeNull();
  });
});

describe("applyStatusChange", () => {
  it("permits documented forward and backward transitions", () => {
    expect(applyStatusChange(baseTask, "review", NOW)?.status).toBe("review");
    expect(
      applyStatusChange({ ...baseTask, status: "review" }, "in_progress", NOW)
        ?.status,
    ).toBe("in_progress");
    expect(
      applyStatusChange({ ...baseTask, status: "done" }, "in_progress", NOW)
        ?.status,
    ).toBe("in_progress");
  });

  it("returns null for undocumented transitions", () => {
    expect(applyStatusChange(baseTask, "done", NOW)).toBeNull();
    expect(applyStatusChange(baseTask, "inbox", NOW)).toBeNull();
  });

  it("leaves id and createdAt unchanged while advancing updatedAt", () => {
    const next = applyStatusChange(baseTask, "ready", NOW);
    expect(next).not.toBeNull();
    expect(next?.id).toBe(baseTask.id);
    expect(next?.createdAt).toBe(baseTask.createdAt);
    expect(next?.updatedAt).toBe(NOW.toISOString());
  });
});

describe("My Flow blocked integration", () => {
  it("places a blocked non-done task in Blocked and removes it when cleared", () => {
    const state = createPrototypeSeedState();
    const ready = state.tasks.find((task) => task.status === "ready");
    expect(ready).toBeTruthy();
    if (!ready) {
      return;
    }

    const blocked = applyTaskEdit(
      ready,
      {
        title: ready.title,
        projectId: ready.projectId,
        priority: ready.priority,
        ownerId: ready.ownerId,
        dueDate: ready.dueDate,
        blockedReason: "Waiting on review",
      },
      NOW,
    );
    state.tasks = state.tasks.map((task) =>
      task.id === ready.id ? blocked : task,
    );

    let data = buildMyFlowDashboard(state, { today: "2026-08-06" });
    expect(data.summary.find((item) => item.label === "Blocked")?.value).toBe(
      "2",
    );

    const cleared = applyTaskEdit(
      blocked,
      {
        title: blocked.title,
        projectId: blocked.projectId,
        priority: blocked.priority,
        ownerId: blocked.ownerId,
        dueDate: blocked.dueDate,
        blockedReason: null,
      },
      NOW,
    );
    state.tasks = state.tasks.map((task) =>
      task.id === ready.id ? cleared : task,
    );
    data = buildMyFlowDashboard(state, { today: "2026-08-06" });
    expect(data.summary.find((item) => item.label === "Blocked")?.value).toBe(
      "1",
    );
  });
});
