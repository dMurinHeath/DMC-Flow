import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UtilityBar } from "./utility-bar";

describe("UtilityBar", () => {
  it("exposes unavailable search and the DM avatar accessibly", () => {
    render(<UtilityBar />);

    const search = screen.getByRole("searchbox", {
      name: "Search tasks (unavailable)",
    });
    expect((search as HTMLInputElement).disabled).toBe(true);

    expect(screen.getByRole("img", { name: "User DM" })).toBeTruthy();
  });
});
