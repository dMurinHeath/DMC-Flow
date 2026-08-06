import { describe, expect, it } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { PrototypeStoreProvider } from "@/components/prototype-store/prototype-store-provider";
import type { PrototypeStorage } from "@/lib/prototype-store/types";
import { MyFlowDashboard } from "./my-flow-dashboard";
import { myFlowFixture } from "./my-flow-fixtures";

function createMemoryStorage(
  initial: Record<string, string> = {},
): PrototypeStorage {
  const store = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
    },
    setItem(key, value) {
      store[key] = value;
    },
  };
}

describe("MyFlowDashboard", () => {
  it("presents the static My Flow dashboard content accessibly", async () => {
    render(
      <PrototypeStoreProvider storage={createMemoryStorage()}>
        <MyFlowDashboard data={myFlowFixture} />
      </PrototypeStoreProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, Danilo" }),
    ).toBeTruthy();
    expect(
      screen.getByText("A clear view of what needs your attention."),
    ).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const summary = screen.getByText("Now", { selector: "dt" }).closest("dl");
    expect(summary).toBeTruthy();
    const summaryQueries = within(summary as HTMLDListElement);
    expect(summaryQueries.getByText("Now", { selector: "dt" })).toBeTruthy();
    expect(summaryQueries.getByText("3", { selector: "dd" })).toBeTruthy();
    expect(summaryQueries.getByText("Next", { selector: "dt" })).toBeTruthy();
    expect(summaryQueries.getByText("5", { selector: "dd" })).toBeTruthy();
    expect(summaryQueries.getByText("Reviews", { selector: "dt" })).toBeTruthy();
    expect(summaryQueries.getByText("2", { selector: "dd" })).toBeTruthy();
    expect(summaryQueries.getByText("Blocked", { selector: "dt" })).toBeTruthy();
    expect(summaryQueries.getByText("1", { selector: "dd" })).toBeTruthy();

    expect(screen.getByText("Approve Flow Gate specification")).toBeTruthy();
    expect(screen.getByText("Prototype task detail")).toBeTruthy();
    expect(screen.getByText("Review AWS deployment options")).toBeTruthy();
    expect(screen.getByText("Define acceptance criteria")).toBeTruthy();
    expect(screen.getByText("Prepare user research plan")).toBeTruthy();

    const viewAll = screen.getByText(/View all 5/);
    expect(viewAll).toBeTruthy();
    expect(viewAll.closest("a")).toBeNull();

    expect(screen.getByText("Tenant isolation tests")).toBeTruthy();
    expect(screen.getByText("Project board interactions")).toBeTruthy();

    const healthHeading = screen.getByRole("heading", {
      name: "Project health",
    });
    const healthSection = healthHeading.closest("section");
    expect(healthSection).toBeTruthy();
    const health = within(healthSection as HTMLElement);
    expect(health.getByText("DMC Flow Pilot")).toBeTruthy();
    expect(health.getByText("On track")).toBeTruthy();
    expect(health.getByText("Cloud Platform")).toBeTruthy();
    expect(health.getByText("Needs attention")).toBeTruthy();

    const addTask = screen.getByRole("button", { name: "Add task" });
    await waitFor(() => {
      expect((addTask as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
