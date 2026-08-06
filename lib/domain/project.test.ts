// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_HEALTH_VALUES,
  PROJECT_NAME_MAX_LENGTH,
  applyProjectEdit,
  isProject,
  isProjectHealth,
  validateProjectDraft,
  type Project,
  type ProjectDraft,
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

const NOW = new Date("2026-08-06T16:00:00.000Z");

function draft(partial: Partial<ProjectDraft> = {}): ProjectDraft {
  return {
    name: "DMC Flow Pilot",
    description: "Build and validate the first responsible delivery workflow.",
    health: "on_track",
    ...partial,
  };
}

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

describe("validateProjectDraft", () => {
  it("rejects empty or whitespace-only names and over-long names", () => {
    expect(validateProjectDraft(draft({ name: "" }))).toEqual([
      { field: "name", code: "empty" },
    ]);
    expect(validateProjectDraft(draft({ name: "   " }))).toEqual([
      { field: "name", code: "empty" },
    ]);
    expect(
      validateProjectDraft(
        draft({ name: "a".repeat(PROJECT_NAME_MAX_LENGTH + 1) }),
      ),
    ).toEqual([{ field: "name", code: "too_long" }]);
  });

  it("rejects an over-long description and accepts an empty description", () => {
    expect(
      validateProjectDraft(
        draft({
          description: "x".repeat(PROJECT_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ),
    ).toEqual([{ field: "description", code: "too_long" }]);
    expect(validateProjectDraft(draft({ description: "" }))).toEqual([]);
  });
});

describe("applyProjectEdit", () => {
  it("trims fields, preserves id/createdAt/archived, and advances updatedAt", () => {
    const next = applyProjectEdit(
      { ...validProject, archived: true },
      draft({
        name: "  Renamed Pilot  ",
        description: "  Updated description  ",
        health: "needs_attention",
      }),
      NOW,
    );

    expect(next.id).toBe(validProject.id);
    expect(next.createdAt).toBe(validProject.createdAt);
    expect(next.archived).toBe(true);
    expect(next.name).toBe("Renamed Pilot");
    expect(next.description).toBe("Updated description");
    expect(next.health).toBe("needs_attention");
    expect(next.updatedAt).toBe(NOW.toISOString());
  });
});
