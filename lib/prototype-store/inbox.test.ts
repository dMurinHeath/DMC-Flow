import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/domain/project";
import type { Task } from "@/lib/domain/task";
import { moveInboxTaskToReady, selectInboxTasks } from "./inbox";
import { selectActiveProjects } from "./projects";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "./seed";
import { PROTOTYPE_OWNER_ID } from "./types";

function makeInboxTask(partial: Partial<Task> & Pick<Task, "id" | "title" | "createdAt">): Task {
  return {
    projectId: null,
    status: "inbox",
    priority: "medium",
    ownerId: PROTOTYPE_OWNER_ID,
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    updatedAt: partial.createdAt,
    ...partial,
  };
}

describe("selectInboxTasks", () => {
  it("returns only inbox tasks sorted newest first without mutating source", () => {
    const older = makeInboxTask({
      id: "task-older",
      title: "Older",
      createdAt: "2026-08-01T10:00:00.000Z",
    });
    const newer = makeInboxTask({
      id: "task-newer",
      title: "Newer",
      createdAt: "2026-08-05T10:00:00.000Z",
    });
    const ready: Task = {
      ...older,
      id: "task-ready",
      title: "Ready",
      status: "ready",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
    };
    const source = [older, ready, newer];
    const snapshot = source.map((task) => ({ ...task }));

    const result = selectInboxTasks(source);

    expect(result.map((task) => task.id)).toEqual(["task-newer", "task-older"]);
    expect(source).toEqual(snapshot);
  });
});

describe("selectActiveProjects", () => {
  it("excludes archived projects and sorts by name", () => {
    const projects: Project[] = [
      {
        id: "proj-z",
        name: "Zebra",
        description: "Z",
        health: "on_track",
        archived: false,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "proj-a",
        name: "Alpha",
        description: "A",
        health: "on_track",
        archived: false,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "proj-old",
        name: "Archived",
        description: "Gone",
        health: "needs_attention",
        archived: true,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
      },
    ];
    const snapshot = projects.map((project) => ({ ...project }));

    const result = selectActiveProjects(projects);

    expect(result.map((project) => project.id)).toEqual(["proj-a", "proj-z"]);
    expect(projects).toEqual(snapshot);
  });
});

describe("moveInboxTaskToReady", () => {
  const seed = createPrototypeSeedState();
  const now = "2026-08-06T12:00:00.000Z";
  const inboxTask = makeInboxTask({
    id: "task-inbox",
    title: "Triage me",
    createdAt: "2026-08-05T10:00:00.000Z",
    priority: "high",
    riskRoute: "controlled",
  });

  it("moves an inbox task onto an active project", () => {
    const result = moveInboxTaskToReady({
      task: inboxTask,
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      projects: seed.projects,
      now,
    });

    expect(result).toEqual({
      ok: true,
      task: {
        ...inboxTask,
        projectId: PROJECT_ID_DMC_FLOW_PILOT,
        status: "ready",
        updatedAt: now,
      },
    });
  });

  it("rejects missing projects", () => {
    const result = moveInboxTaskToReady({
      task: inboxTask,
      projectId: "proj-missing",
      projects: seed.projects,
      now,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects archived projects", () => {
    const projects = seed.projects.map((project) =>
      project.id === PROJECT_ID_CLOUD_PLATFORM
        ? { ...project, archived: true }
        : project,
    );

    const result = moveInboxTaskToReady({
      task: inboxTask,
      projectId: PROJECT_ID_CLOUD_PLATFORM,
      projects,
      now,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects non-inbox tasks", () => {
    const result = moveInboxTaskToReady({
      task: { ...inboxTask, status: "ready", projectId: PROJECT_ID_DMC_FLOW_PILOT },
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      projects: seed.projects,
      now,
    });

    expect(result.ok).toBe(false);
  });
});
