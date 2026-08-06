// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  dayToOrdinal,
  isValidDateOnly,
  parseDateOnly,
} from "./date-only";

describe("date-only", () => {
  it("accepts a valid ISO date", () => {
    expect(parseDateOnly("2026-08-06")).toEqual({
      year: 2026,
      month: 8,
      day: 6,
    });
    expect(isValidDateOnly("2026-08-06")).toBe(true);
  });

  it("rejects malformed, impossible and non-ISO-order dates", () => {
    expect(parseDateOnly("not-a-date")).toBeNull();
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("06-08-2026")).toBeNull();
    expect(isValidDateOnly("2026-02-30")).toBe(false);
  });

  it("orders known calendar days by ordinal", () => {
    const earlier = parseDateOnly("2026-08-06");
    const later = parseDateOnly("2026-08-08");
    expect(earlier).not.toBeNull();
    expect(later).not.toBeNull();
    expect(dayToOrdinal(later!) - dayToOrdinal(earlier!)).toBe(2);
  });
});
