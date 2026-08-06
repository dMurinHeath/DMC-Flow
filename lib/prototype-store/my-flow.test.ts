import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/domain/task";
import {
  addCalendarDays,
  buildMyFlowDashboard,
  formatMyFlowDueLabel,
  resolveOwnerInitials,
} from "./my-flow";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "./seed";
import { PROTOTYPE_OWNER_ID, type PrototypeState } from "./types";

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

describe("buildMyFlowDashboard", () => {
  it("derives the seed summary 3 / 5 / 2 / 1", () => {
    const data = buildMyFlowDashboard(createPrototypeSeedState(), {
      today: TODAY,
    });

    expect(data.summary.map((item) => item.value)).toEqual(["3", "5", "2", "1"]);
    expect(data.nowTasks).toHaveLength(3);
    expect(data.nextTasks).toHaveLength(2);
    expect(data.nextTotalLabel).toBe("View all 5");
    expect(data.reviewQueue).toHaveLength(2);
    expect(data.projectHealth.map((project) => project.name)).toEqual([
      "Cloud Platform",
      "DMC Flow Pilot",
    ]);
  });

  it("excludes inbox and done tasks from workflow sections", () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeTask({
        id: "task-inbox",
        title: "Inbox only",
        status: "inbox",
        projectId: null,
      }),
      makeTask({
        id: "task-done",
        title: "Already done",
        status: "done",
      }),
    );

    const data = buildMyFlowDashboard(state, { today: TODAY });
    const titles = [
      ...data.nowTasks.map((task) => task.title),
      ...data.nextTasks.map((task) => task.title),
      ...data.reviewQueue.map((item) => item.title),
    ];

    expect(titles).not.toContain("Inbox only");
    expect(titles).not.toContain("Already done");
    expect(data.summary.find((item) => item.label === "Next")?.value).toBe("5");
  });

  it("increases Next after a Ready triage without mutating source", () => {
    const state = createPrototypeSeedState();
    const snapshot = {
      tasks: state.tasks.map((task) => ({ ...task })),
      projects: state.projects.map((project) => ({ ...project })),
    };
    state.tasks.push(
      makeTask({
        id: "task-triaged",
        title: "Fresh ready",
        status: "ready",
        priority: "high",
        dueDate: "2026-08-06",
      }),
    );

    const data = buildMyFlowDashboard(state, { today: TODAY });
    expect(data.summary.find((item) => item.label === "Next")?.value).toBe("6");
    expect(data.nextTotalLabel).toBe("View all 6");
    expect(data.nextTasks[0]?.title).toBe("Fresh ready");
    expect(data.nextTasks).toHaveLength(2);

    expect(snapshot.tasks).toHaveLength(10);
  });

  it("orders by priority then due date without mutating source arrays", () => {
    const state: PrototypeState = {
      projects: createPrototypeSeedState().projects,
      tasks: [
        makeTask({
          id: "task-low-early",
          title: "Low early",
          status: "ready",
          priority: "low",
          dueDate: "2026-08-07",
        }),
        makeTask({
          id: "task-high-late",
          title: "High late",
          status: "ready",
          priority: "high",
          dueDate: "2026-08-10",
        }),
        makeTask({
          id: "task-high-early",
          title: "High early",
          status: "ready",
          priority: "high",
          dueDate: "2026-08-08",
        }),
        makeTask({
          id: "task-medium-none",
          title: "Medium none",
          status: "ready",
          priority: "medium",
          dueDate: null,
        }),
      ],
    };
    const originalOrder = state.tasks.map((task) => task.id);

    const data = buildMyFlowDashboard(state, { today: TODAY });

    expect(data.nextTasks.map((task) => task.id)).toEqual([
      "task-high-early",
      "task-high-late",
    ]);
    expect(data.nextTotalLabel).toBe("View all 4");
    expect(state.tasks.map((task) => task.id)).toEqual(originalOrder);
  });

  it("does not count whitespace-only blocked reasons or done tasks as blocked", () => {
    const state: PrototypeState = {
      projects: createPrototypeSeedState().projects,
      tasks: [
        makeTask({
          id: "task-ws",
          title: "Whitespace",
          status: "in_progress",
          blockedReason: "   ",
        }),
        makeTask({
          id: "task-done-blocked",
          title: "Done blocked",
          status: "done",
          blockedReason: "Was blocked",
        }),
        makeTask({
          id: "task-real-blocked",
          title: "Real blocked",
          status: "ready",
          blockedReason: "Waiting",
        }),
      ],
    };

    const data = buildMyFlowDashboard(state, { today: TODAY });
    expect(data.summary.find((item) => item.label === "Blocked")?.value).toBe(
      "1",
    );
  });

  it("excludes archived projects and sorts health by name", () => {
    const state = createPrototypeSeedState();
    state.projects = state.projects.map((project) =>
      project.id === PROJECT_ID_CLOUD_PLATFORM
        ? { ...project, archived: true }
        : project,
    );

    const data = buildMyFlowDashboard(state, { today: TODAY });
    expect(data.projectHealth.map((project) => project.id)).toEqual([
      PROJECT_ID_DMC_FLOW_PILOT,
    ]);
  });

  it("renders safe fallbacks for missing project, owner and due date", () => {
    const state: PrototypeState = {
      projects: createPrototypeSeedState().projects,
      tasks: [
        makeTask({
          id: "task-fallbacks",
          title: "Fallbacks",
          status: "in_progress",
          projectId: "proj-missing",
          ownerId: null,
          dueDate: null,
        }),
      ],
    };

    const data = buildMyFlowDashboard(state, { today: TODAY });
    expect(data.nowTasks[0]).toMatchObject({
      project: "Unassigned",
      ownerInitials: "—",
      due: "No due date",
    });
  });

  it("keeps duplicate titles distinct via stable IDs", () => {
    const state: PrototypeState = {
      projects: createPrototypeSeedState().projects,
      tasks: [
        makeTask({
          id: "task-dup-a",
          title: "Same title",
          status: "in_progress",
          priority: "high",
          dueDate: "2026-08-06",
        }),
        makeTask({
          id: "task-dup-b",
          title: "Same title",
          status: "in_progress",
          priority: "high",
          dueDate: "2026-08-06",
        }),
      ],
    };

    const data = buildMyFlowDashboard(state, { today: TODAY });
    expect(data.nowTasks.map((task) => task.id)).toEqual([
      "task-dup-a",
      "task-dup-b",
    ]);
  });
});

describe("formatMyFlowDueLabel", () => {
  it("formats deterministic timezone-safe labels", () => {
    expect(formatMyFlowDueLabel(null, TODAY)).toBe("No due date");
    expect(formatMyFlowDueLabel("not-a-date", TODAY)).toBe("Invalid date");
    expect(formatMyFlowDueLabel(TODAY, TODAY)).toBe("Today");
    expect(formatMyFlowDueLabel(addCalendarDays(TODAY, 1), TODAY)).toBe(
      "Tomorrow",
    );
    expect(formatMyFlowDueLabel(addCalendarDays(TODAY, 2), TODAY)).toBe(
      "Saturday",
    );
    expect(formatMyFlowDueLabel(addCalendarDays(TODAY, 7), TODAY)).toBe(
      "13 Aug 2026",
    );
  });
});

describe("resolveOwnerInitials", () => {
  it("maps the prototype owner and falls back otherwise", () => {
    expect(resolveOwnerInitials(PROTOTYPE_OWNER_ID)).toBe("DM");
    expect(resolveOwnerInitials(null)).toBe("—");
    expect(resolveOwnerInitials("user-other")).toBe("—");
  });
});
