import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SideNav } from "./side-nav";

describe("SideNav", () => {
  it("marks My Flow as the current page with the correct link", () => {
    render(<SideNav activeNav="my-flow" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const myFlow = within(nav).getByRole("link", { name: "My Flow" });
    const inbox = within(nav).getByRole("link", { name: "Inbox" });
    const projects = within(nav).getByRole("link", { name: "Projects" });

    expect(myFlow.getAttribute("href")).toBe("/");
    expect(myFlow.getAttribute("aria-current")).toBe("page");
    expect(inbox.getAttribute("href")).toBe("/inbox");
    expect(inbox.getAttribute("aria-current")).toBeNull();
    expect(projects.getAttribute("href")).toBe("/projects");
    expect(projects.getAttribute("aria-current")).toBeNull();
  });

  it("marks Inbox as the current page with the correct link", () => {
    render(<SideNav activeNav="inbox" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const myFlow = within(nav).getByRole("link", { name: "My Flow" });
    const inbox = within(nav).getByRole("link", { name: "Inbox" });

    expect(inbox.getAttribute("href")).toBe("/inbox");
    expect(inbox.getAttribute("aria-current")).toBe("page");
    expect(myFlow.getAttribute("href")).toBe("/");
    expect(myFlow.getAttribute("aria-current")).toBeNull();
  });

  it("marks Projects as the current page with the correct link", () => {
    render(<SideNav activeNav="projects" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const projects = within(nav).getByRole("link", { name: "Projects" });
    const myFlow = within(nav).getByRole("link", { name: "My Flow" });

    expect(projects.getAttribute("href")).toBe("/projects");
    expect(projects.getAttribute("aria-current")).toBe("page");
    expect(myFlow.getAttribute("aria-current")).toBeNull();
  });

  it("keeps Reviews unavailable", () => {
    render(<SideNav activeNav="my-flow" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).queryByRole("link", { name: /Reviews/ })).toBeNull();
    expect(within(nav).getByRole("link", { name: "Projects" })).toBeTruthy();

    expect(within(nav).getByText("Reviews").closest("[aria-disabled='true']")).toBeTruthy();
    expect(within(nav).getAllByText("(unavailable)", { exact: false })).toHaveLength(1);
  });
});
