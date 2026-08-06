// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PROJECT_HEALTH_VALUES, isProjectHealth } from "./project";

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
