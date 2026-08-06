import { describe, expect, it, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { PrototypeStoreProvider } from "@/components/prototype-store/prototype-store-provider";
import type { Task } from "@/lib/domain/task";
import { createInboxTask } from "@/lib/prototype-store/create-inbox-task";
import { moveInboxTaskToReady } from "@/lib/prototype-store/inbox";
import {
  PROJECT_ID_DMC_FLOW_PILOT,
  createPrototypeSeedState,
} from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_OWNER_ID,
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeState,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { MyFlowView } from "./my-flow-view";

const TODAY = "2026-08-06";

function createMemoryStorage(
  initial: Record<string, string> = {},
): PrototypeStorage & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
    },
    setItem(key, value) {
      store[key] = value;
    },
  };
}

function envelope(state: PrototypeState): string {
  return JSON.stringify({
    version: PROTOTYPE_STATE_VERSION,
    state,
  });
}

function makeTask(
  partial: Partial<Task> & Pick<Task, "id" | "title" | "status">,
): Task {
  return {
    projectId: PROJECT_ID_DMC_FLOW_PILOT,
    priority: "medium",
    ownerId: PROTOTYPE_OWNER_ID,
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...partial,
  };
}

function renderView(options?: {
  storage?: ReturnType<typeof createMemoryStorage>;
  state?: PrototypeState;
}) {
  const state = options?.state ?? createPrototypeSeedState();
  const storage =
    options?.storage ??
    createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(state),
    });

  const view = render(
    <PrototypeStoreProvider storage={storage}>
      <MyFlowView getToday={() => TODAY} />
    </PrototypeStoreProvider>,
  );
  return { ...view, storage, state };
}

async function waitForDashboard() {
  await waitFor(() => {
    expect(screen.queryByText("Loading your My Flow…")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, Danilo" }),
    ).toBeTruthy();
  });
}

function summaryValue(label: string): string {
  const summary = screen.getByText(label, { selector: "dt" }).closest("dl");
  const row = within(summary as HTMLDListElement)
    .getByText(label, { selector: "dt" })
    .closest("div");
  return within(row as HTMLElement).getByRole("definition").textContent ?? "";
}

describe("MyFlowView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading instead of summary counts before hydration", () => {
    const queued: Array<() => void> = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      queued.push(callback);
    });

    renderView({ storage: createMemoryStorage() });

    expect(screen.getByRole("status").textContent).toMatch(/Loading your My Flow/i);
    expect(screen.queryByText("Now", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("3", { selector: "dd" })).toBeNull();
  });

  it("renders seed-derived counts after hydration", async () => {
    renderView();
    await waitForDashboard();

    expect(summaryValue("Now")).toBe("3");
    expect(summaryValue("Next")).toBe("5");
    expect(summaryValue("Reviews")).toBe("2");
    expect(summaryValue("Blocked")).toBe("1");
    expect(screen.getByText("View all 5")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Edit Approve Flow Gate specification",
      }),
    ).toBeTruthy();
  });

  it("replaces seed with persisted state after hydration", async () => {
    const state = createPrototypeSeedState();
    state.tasks = state.tasks.filter((task) => task.status !== "ready");
    state.tasks.push(
      makeTask({
        id: "task-only-ready",
        title: "Only ready task",
        status: "ready",
        priority: "high",
        dueDate: "2026-08-06",
      }),
    );

    renderView({ state });
    await waitForDashboard();

    expect(summaryValue("Next")).toBe("1");
    expect(screen.getAllByText("Only ready task").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("View all 1")).toBeTruthy();
  });

  it("increases Next after triage and persists through remount", async () => {
    const state = createPrototypeSeedState();
    const inbox = createInboxTask({
      title: "Triaged from inbox",
      id: "task-from-inbox",
      now: "2026-08-06T12:00:00.000Z",
    });
    state.tasks.push(inbox);
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(state),
    });

    const moved = moveInboxTaskToReady({
      task: inbox,
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      projects: state.projects,
      now: "2026-08-06T13:00:00.000Z",
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      return;
    }
    state.tasks = state.tasks.map((task) =>
      task.id === inbox.id ? moved.task : task,
    );
    storage.setItem(PROTOTYPE_STATE_STORAGE_KEY, envelope(state));

    const { unmount } = renderView({ storage, state });
    await waitForDashboard();
    expect(summaryValue("Next")).toBe("6");

    unmount();
    renderView({ storage });
    await waitForDashboard();
    expect(summaryValue("Next")).toBe("6");
  });

  it("keeps Add task available after hydration", async () => {
    renderView();
    await waitForDashboard();

    const addTask = screen.getByRole("button", { name: "Add task" });
    await waitFor(() => {
      expect((addTask as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("renders accessible empty states", async () => {
    const state: PrototypeState = {
      projects: [],
      tasks: [],
    };
    renderView({ state });
    await waitForDashboard();

    expect(screen.getByText("No tasks in progress.")).toBeTruthy();
    expect(screen.getByText("No Ready tasks yet.")).toBeTruthy();
    expect(screen.getByText("No tasks awaiting review.")).toBeTruthy();
    expect(screen.getByText("No active projects.")).toBeTruthy();
  });

  it("renders duplicate titles without relying on title keys", async () => {
    const state: PrototypeState = {
      projects: createPrototypeSeedState().projects,
      tasks: [
        makeTask({
          id: "task-a",
          title: "Duplicate",
          status: "in_progress",
          priority: "high",
          dueDate: "2026-08-06",
        }),
        makeTask({
          id: "task-b",
          title: "Duplicate",
          status: "in_progress",
          priority: "medium",
          dueDate: "2026-08-06",
        }),
      ],
    };

    renderView({ state });
    await waitForDashboard();

    const links = screen.getAllByRole("link", { name: "Duplicate" });
    expect(links).toHaveLength(2);
    expect(
      links.map((link) => link.getAttribute("href")).sort(),
    ).toEqual(["/tasks/task-a", "/tasks/task-b"]);
  });

  it("does not change counts when only an Inbox task is added in storage", async () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      createInboxTask({
        title: "Still inbox",
        id: "task-still-inbox",
        now: "2026-08-06T12:00:00.000Z",
      }),
    );

    renderView({ state });
    await waitForDashboard();

    expect(summaryValue("Now")).toBe("3");
    expect(summaryValue("Next")).toBe("5");
    expect(screen.queryByText("Still inbox")).toBeNull();
  });
});
