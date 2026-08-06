// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/domain/project";
import type { Task } from "@/lib/domain/task";
import { reducePrototypeState } from "./reducer";
import { createPrototypeSeedState } from "./seed";

function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-new",
    title: "New prototype task",
    projectId: "proj-dmc-flow-pilot",
    status: "inbox",
    priority: "low",
    ownerId: "user-dm",
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function sampleProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-new",
    name: "New Project",
    description: "Prototype project",
    health: "on_track",
    archived: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("reducePrototypeState", () => {
  it("adds a new task and replaces an existing task without duplication", () => {
    const state = createPrototypeSeedState();
    const added = reducePrototypeState(state, {
      type: "save_task",
      task: sampleTask(),
    });
    expect(added.tasks).toHaveLength(state.tasks.length + 1);
    expect(added.tasks.at(-1)?.id).toBe("task-new");

    const replaced = reducePrototypeState(added, {
      type: "save_task",
      task: sampleTask({ title: "Updated prototype task" }),
    });
    expect(replaced.tasks).toHaveLength(added.tasks.length);
    expect(
      replaced.tasks.find((task) => task.id === "task-new")?.title,
    ).toBe("Updated prototype task");
  });

  it("removes an existing task and ignores unknown task ids", () => {
    const state = createPrototypeSeedState();
    const targetId = state.tasks[0]!.id;
    const removed = reducePrototypeState(state, {
      type: "remove_task",
      taskId: targetId,
    });
    expect(removed.tasks).toHaveLength(state.tasks.length - 1);
    expect(removed.tasks.some((task) => task.id === targetId)).toBe(false);

    const ignored = reducePrototypeState(removed, {
      type: "remove_task",
      taskId: "missing-task",
    });
    expect(ignored.tasks).toHaveLength(removed.tasks.length);
  });

  it("adds and replaces a project", () => {
    const state = createPrototypeSeedState();
    const added = reducePrototypeState(state, {
      type: "save_project",
      project: sampleProject(),
    });
    expect(added.projects).toHaveLength(state.projects.length + 1);

    const replaced = reducePrototypeState(added, {
      type: "save_project",
      project: sampleProject({ name: "Renamed Project" }),
    });
    expect(replaced.projects).toHaveLength(added.projects.length);
    expect(
      replaced.projects.find((project) => project.id === "proj-new")?.name,
    ).toBe("Renamed Project");
  });

  it("resets to fresh seed data", () => {
    const state = createPrototypeSeedState();
    const mutated = reducePrototypeState(state, {
      type: "save_task",
      task: sampleTask(),
    });
    const reset = reducePrototypeState(mutated, { type: "reset" });
    expect(reset.tasks).toHaveLength(createPrototypeSeedState().tasks.length);
    expect(reset.tasks.some((task) => task.id === "task-new")).toBe(false);
  });

  it("does not mutate previous state or supplied entities", () => {
    const state = createPrototypeSeedState();
    const task = sampleTask();
    const snapshot = structuredClone(state);
    const taskSnapshot = structuredClone(task);

    const next = reducePrototypeState(state, { type: "save_task", task });
    expect(state).toEqual(snapshot);
    expect(task).toEqual(taskSnapshot);
    expect(next).not.toBe(state);
    expect(next.tasks).not.toBe(state.tasks);
  });
});
