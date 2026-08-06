import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SideNav } from "./side-nav";

describe("SideNav", () => {
  it("marks My Flow as the current page with the correct link", () => {
    render(<SideNav activeNav="my-flow" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const myFlow = within(nav).getByRole("link", { name: "My Flow" });
    const inbox = within(nav).getByRole("link", { name: "Inbox" });

    expect(myFlow.getAttribute("href")).toBe("/");
    expect(myFlow.getAttribute("aria-current")).toBe("page");
    expect(inbox.getAttribute("href")).toBe("/inbox");
    expect(inbox.getAttribute("aria-current")).toBeNull();
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

  it("keeps Reviews and Projects unavailable", () => {
    render(<SideNav activeNav="my-flow" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).queryByRole("link", { name: /Reviews/ })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Projects/ })).toBeNull();

    expect(within(nav).getByText("Reviews").closest("[aria-disabled='true']")).toBeTruthy();
    expect(within(nav).getByText("Projects").closest("[aria-disabled='true']")).toBeTruthy();
    expect(within(nav).getAllByText("(unavailable)", { exact: false })).toHaveLength(2);
  });
});
