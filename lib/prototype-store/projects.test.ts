// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Project, ProjectDraft } from "@/lib/domain/project";
import type { Task } from "@/lib/domain/task";
import {
  archiveProject,
  createProject,
  restoreProject,
  selectActiveProjects,
  selectArchivedProjects,
  countOpenTasksForProject,
} from "./projects";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "./seed";
import { buildMyFlowDashboard } from "./my-flow";
import { PROTOTYPE_OWNER_ID } from "./types";

const NOW = "2026-08-06T16:00:00.000Z";

function draft(partial: Partial<ProjectDraft> = {}): ProjectDraft {
  return {
    name: "New Project",
    description: "A description",
    health: "on_track",
    ...partial,
  };
}

function makeProject(partial: Partial<Project> & Pick<Project, "id" | "name">): Project {
  return {
    description: "",
    health: "on_track",
    archived: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...partial,
  };
}

function makeTask(
  partial: Partial<Task> & Pick<Task, "id" | "title" | "projectId" | "status">,
): Task {
  return {
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

describe("createProject", () => {
  it("creates an active project with trimmed fields and matching timestamps", () => {
    const project = createProject({
      draft: draft({
        name: "  Alpha  ",
        description: "  Hello  ",
        health: "needs_attention",
      }),
      id: "proj-alpha",
      now: NOW,
    });

    expect(project).toEqual({
      id: "proj-alpha",
      name: "Alpha",
      description: "Hello",
      health: "needs_attention",
      archived: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
});

describe("selectActiveProjects", () => {
  it("excludes archived projects and sorts by name", () => {
    const projects: Project[] = [
      makeProject({ id: "proj-z", name: "Zebra" }),
      makeProject({ id: "proj-a", name: "Alpha" }),
      makeProject({ id: "proj-old", name: "Archived", archived: true }),
    ];
    const snapshot = projects.map((project) => ({ ...project }));

    const result = selectActiveProjects(projects);

    expect(result.map((project) => project.id)).toEqual(["proj-a", "proj-z"]);
    expect(projects).toEqual(snapshot);
  });
});

describe("selectArchivedProjects", () => {
  it("returns only archived projects sorted by name without mutating source", () => {
    const projects: Project[] = [
      makeProject({ id: "proj-z", name: "Zebra", archived: true }),
      makeProject({ id: "proj-a", name: "Alpha", archived: true }),
      makeProject({ id: "proj-live", name: "Live" }),
    ];
    const snapshot = projects.map((project) => ({ ...project }));

    const result = selectArchivedProjects(projects);

    expect(result.map((project) => project.id)).toEqual(["proj-a", "proj-z"]);
    expect(projects).toEqual(snapshot);
  });
});

describe("countOpenTasksForProject", () => {
  it("counts only matching tasks that are not done", () => {
    const tasks = [
      makeTask({
        id: "t1",
        title: "Open",
        projectId: "proj-a",
        status: "ready",
      }),
      makeTask({
        id: "t2",
        title: "Done",
        projectId: "proj-a",
        status: "done",
      }),
      makeTask({
        id: "t3",
        title: "Other",
        projectId: "proj-b",
        status: "ready",
      }),
    ];

    expect(countOpenTasksForProject(tasks, "proj-a")).toBe(1);
  });
});

describe("archiveProject", () => {
  it("refuses when already archived", () => {
    const result = archiveProject({
      project: makeProject({ id: "proj-a", name: "Alpha", archived: true }),
      tasks: [],
      now: NOW,
    });
    expect(result).toEqual({
      ok: false,
      message: "This project is already archived.",
    });
  });

  it("refuses while open tasks remain and includes the count", () => {
    const tasks = [
      makeTask({
        id: "t1",
        title: "One",
        projectId: "proj-a",
        status: "ready",
      }),
      makeTask({
        id: "t2",
        title: "Two",
        projectId: "proj-a",
        status: "in_progress",
      }),
    ];
    const result = archiveProject({
      project: makeProject({ id: "proj-a", name: "Alpha" }),
      tasks,
      now: NOW,
    });
    expect(result).toEqual({
      ok: false,
      message:
        "Cannot archive while 2 open tasks are still assigned to this project.",
    });
  });

  it("succeeds with no tasks or only done tasks", () => {
    const empty = archiveProject({
      project: makeProject({ id: "proj-a", name: "Alpha" }),
      tasks: [],
      now: NOW,
    });
    expect(empty.ok).toBe(true);
    if (empty.ok) {
      expect(empty.project.archived).toBe(true);
      expect(empty.project.updatedAt).toBe(NOW);
    }

    const allDone = archiveProject({
      project: makeProject({ id: "proj-a", name: "Alpha" }),
      tasks: [
        makeTask({
          id: "t1",
          title: "Done",
          projectId: "proj-a",
          status: "done",
        }),
      ],
      now: NOW,
    });
    expect(allDone.ok).toBe(true);
  });
});

describe("restoreProject", () => {
  it("clears archived and advances updatedAt", () => {
    const restored = restoreProject({
      project: makeProject({ id: "proj-a", name: "Alpha", archived: true }),
      now: NOW,
    });
    expect(restored.archived).toBe(false);
    expect(restored.updatedAt).toBe(NOW);
    expect(restored.id).toBe("proj-a");
  });
});

describe("archive consequential My Flow health", () => {
  it("removes archived project from active list and health while keeping task project names", () => {
    const state = createPrototypeSeedState();
    const cloud = state.projects.find(
      (project) => project.id === PROJECT_ID_CLOUD_PLATFORM,
    );
    expect(cloud).toBeTruthy();
    if (!cloud) {
      return;
    }

    state.tasks = state.tasks.map((task) =>
      task.projectId === PROJECT_ID_CLOUD_PLATFORM
        ? { ...task, status: "done" as const }
        : task,
    );

    const archived = archiveProject({
      project: cloud,
      tasks: state.tasks,
      now: NOW,
    });
    expect(archived.ok).toBe(true);
    if (!archived.ok) {
      return;
    }

    state.projects = state.projects.map((project) =>
      project.id === cloud.id ? archived.project : project,
    );

    expect(
      selectActiveProjects(state.projects).map((project) => project.id),
    ).toEqual([PROJECT_ID_DMC_FLOW_PILOT]);

    const data = buildMyFlowDashboard(state, { today: "2026-08-06" });
    expect(data.projectHealth.map((item) => item.id)).toEqual([
      PROJECT_ID_DMC_FLOW_PILOT,
    ]);
    expect(data.projectHealth.some((item) => item.id === cloud.id)).toBe(false);

    // projectNameById ignores archived — restoring a task to Ready still shows the name
    const cloudTask = state.tasks.find(
      (task) => task.projectId === PROJECT_ID_CLOUD_PLATFORM,
    );
    expect(cloudTask).toBeTruthy();
    if (!cloudTask) {
      return;
    }
    state.tasks = state.tasks.map((task) =>
      task.id === cloudTask.id ? { ...task, status: "ready" as const } : task,
    );
    const after = buildMyFlowDashboard(state, { today: "2026-08-06" });
    expect(
      after.nextTasks.some((row) => row.project === "Cloud Platform"),
    ).toBe(true);
  });
});
