// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isTaskBlocked } from "@/lib/domain/task";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "./seed";

describe("createPrototypeSeedState", () => {
  it("returns the expected two projects", () => {
    const state = createPrototypeSeedState();
    expect(state.projects).toHaveLength(2);
    expect(state.projects.map((project) => project.name)).toEqual([
      "DMC Flow Pilot",
      "Cloud Platform",
    ]);
    expect(state.projects.map((project) => project.health)).toEqual([
      "on_track",
      "needs_attention",
    ]);
  });

  it("contains exact workflow counts and one blocked task", () => {
    const state = createPrototypeSeedState();
    expect(state.tasks.filter((task) => task.status === "in_progress")).toHaveLength(
      3,
    );
    expect(state.tasks.filter((task) => task.status === "ready")).toHaveLength(5);
    expect(state.tasks.filter((task) => task.status === "review")).toHaveLength(2);
    expect(state.tasks.filter((task) => isTaskBlocked(task))).toHaveLength(1);
    expect(state.tasks.some((task) => task.status === ("blocked" as never))).toBe(
      false,
    );
  });

  it("returns a fresh independent state on every call", () => {
    const first = createPrototypeSeedState();
    const second = createPrototypeSeedState();
    expect(first).not.toBe(second);
    expect(first.tasks).not.toBe(second.tasks);
    expect(first.projects).not.toBe(second.projects);
    first.tasks[0]!.title = "mutated";
    expect(second.tasks[0]!.title).not.toBe("mutated");
  });

  it("references only seeded projects for every task", () => {
    const state = createPrototypeSeedState();
    const projectIds = new Set(state.projects.map((project) => project.id));
    expect(projectIds).toEqual(
      new Set([PROJECT_ID_DMC_FLOW_PILOT, PROJECT_ID_CLOUD_PLATFORM]),
    );

    for (const task of state.tasks) {
      expect(task.projectId === null || projectIds.has(task.projectId)).toBe(
        true,
      );
      expect(task.projectId).not.toBeNull();
    }
  });
});
