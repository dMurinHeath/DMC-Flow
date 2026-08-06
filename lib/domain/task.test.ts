// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  TASK_TITLE_MAX_LENGTH,
  parseTaskDraft,
} from "./task";

describe("parseTaskDraft", () => {
  it("accepts a normal valid title", () => {
    const result = parseTaskDraft({ title: "Approve Flow Gate specification" });
    expect(result).toEqual({
      ok: true,
      value: { title: "Approve Flow Gate specification" },
    });
  });

  it("trims surrounding whitespace", () => {
    const result = parseTaskDraft({ title: "  Capture title  " });
    expect(result).toEqual({
      ok: true,
      value: { title: "Capture title" },
    });
  });

  it("preserves meaningful internal whitespace", () => {
    const result = parseTaskDraft({ title: "Define  acceptance  criteria" });
    expect(result).toEqual({
      ok: true,
      value: { title: "Define  acceptance  criteria" },
    });
  });

  it("rejects null, arrays and primitive non-object inputs", () => {
    for (const input of [null, ["title"], "title", 42, true, undefined]) {
      const result = parseTaskDraft(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toEqual([
          expect.objectContaining({
            field: "title",
            code: "invalid_type",
          }),
        ]);
      }
    }
  });

  it("rejects an object with no title", () => {
    const result = parseTaskDraft({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "required" }),
      ]);
    }
  });

  it("rejects a non-string title", () => {
    const result = parseTaskDraft({ title: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "invalid_type" }),
      ]);
    }
  });

  it("rejects an empty title", () => {
    const result = parseTaskDraft({ title: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "required" }),
      ]);
    }
  });

  it("rejects a whitespace-only title", () => {
    const result = parseTaskDraft({ title: "   \t  " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ field: "title", code: "required" }),
      ]);
    }
  });

  it("accepts a title at the exact maximum length and rejects one character above", () => {
    const atMax = "a".repeat(TASK_TITLE_MAX_LENGTH);
    const overMax = "a".repeat(TASK_TITLE_MAX_LENGTH + 1);

    expect(parseTaskDraft({ title: atMax })).toEqual({
      ok: true,
      value: { title: atMax },
    });

    const overResult = parseTaskDraft({ title: overMax });
    expect(overResult.ok).toBe(false);
    if (!overResult.ok) {
      expect(overResult.issues).toEqual([
        expect.objectContaining({ field: "title", code: "too_long" }),
      ]);
    }
  });

  it("returns stable issue field and code values", () => {
    const result = parseTaskDraft({ title: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.field).toBe("title");
      expect(result.issues[0]?.code).toBe("invalid_type");
      expect(typeof result.issues[0]?.message).toBe("string");
    }
  });

  it("does not mutate the supplied input", () => {
    const input = { title: "  Keep input unchanged  " };
    const snapshot = structuredClone(input);
    parseTaskDraft(input);
    expect(input).toEqual(snapshot);
  });
});
