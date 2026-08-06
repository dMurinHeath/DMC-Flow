// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  PROJECT_HEALTH_VALUES,
  isProject,
  isProjectHealth,
  type Project,
} from "./project";

const validProject: Project = {
  id: "proj-dmc-flow-pilot",
  name: "DMC Flow Pilot",
  description: "Build and validate the first responsible delivery workflow.",
  health: "on_track",
  archived: false,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

describe("project health", () => {
  it("exposes the exact project-health values", () => {
    expect([...PROJECT_HEALTH_VALUES]).toEqual([
      "on_track",
      "needs_attention",
    ]);
  });

  it("accepts supported health values and rejects unknown strings", () => {
    for (const health of PROJECT_HEALTH_VALUES) {
      expect(isProjectHealth(health)).toBe(true);
    }

    expect(isProjectHealth("at_risk")).toBe(false);
    expect(isProjectHealth("On track")).toBe(false);
    expect(isProjectHealth(null)).toBe(false);
    expect(isProjectHealth(0)).toBe(false);
  });
});

describe("isProject", () => {
  it("accepts a structurally valid project", () => {
    expect(isProject(validProject)).toBe(true);
  });

  it("rejects unknown shapes and invalid field values", () => {
    expect(isProject(null)).toBe(false);
    expect(isProject([])).toBe(false);
    expect(isProject({ ...validProject, health: "at_risk" })).toBe(false);
    expect(isProject({ ...validProject, archived: "no" })).toBe(false);
    expect(isProject({ ...validProject, name: 1 })).toBe(false);
  });
});
