import { describe, expect, it, vi, afterEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "@/components/prototype-store/prototype-store-provider";
import type { Task } from "@/lib/domain/task";
import { createPrototypeSeedState, PROJECT_ID_DMC_FLOW_PILOT } from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_OWNER_ID,
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeState,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { InboxView } from "./inbox-view";

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

function makeInboxTask(
  partial: Partial<Task> & Pick<Task, "id" | "title" | "createdAt">,
): Task {
  return {
    projectId: null,
    status: "inbox",
    priority: "medium",
    ownerId: PROTOTYPE_OWNER_ID,
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    updatedAt: partial.createdAt,
    ...partial,
  };
}

function StoreProbe() {
  const { state, hydrated } = usePrototypeStore();
  return (
    <div>
      <p data-testid="hydrated">{String(hydrated)}</p>
      <p data-testid="task-ids">
        {state.tasks.map((task) => task.id).join(",")}
      </p>
      <p data-testid="ready-tasks">
        {state.tasks
          .filter((task) => task.status === "ready")
          .map((task) => `${task.id}:${task.projectId}:${task.updatedAt}`)
          .join("|")}
      </p>
    </div>
  );
}

function renderInbox(options?: {
  storage?: ReturnType<typeof createMemoryStorage>;
  getNow?: () => Date;
  state?: PrototypeState;
}) {
  const seed = options?.state ?? createPrototypeSeedState();
  const storage =
    options?.storage ??
    createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(seed),
    });

  const view = render(
    <PrototypeStoreProvider storage={storage}>
      <InboxView getNow={options?.getNow} />
      <StoreProbe />
    </PrototypeStoreProvider>,
  );

  return { ...view, storage, seed };
}

async function waitForHydration() {
  await waitFor(() => {
    expect(screen.getByTestId("hydrated").textContent).toBe("true");
  });
}

describe("InboxView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before hydration and not an empty claim", () => {
    const queued: Array<() => void> = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      queued.push(callback);
    });

    renderInbox({
      storage: createMemoryStorage(),
    });

    expect(screen.getByRole("status").textContent).toMatch(/Loading/i);
    expect(screen.queryByText("Inbox is empty.")).toBeNull();
    expect(screen.getByTestId("hydrated").textContent).toBe("false");
  });

  it("shows the empty state only after hydration", async () => {
    const queued: Array<() => void> = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      queued.push(callback);
    });

    renderInbox({
      storage: createMemoryStorage({
        [PROTOTYPE_STATE_STORAGE_KEY]: envelope(createPrototypeSeedState()),
      }),
    });

    expect(screen.queryByText("Inbox is empty.")).toBeNull();

    act(() => {
      for (const callback of queued) {
        callback();
      }
    });

    await waitFor(() => {
      expect(screen.getByText("Inbox is empty.")).toBeTruthy();
    });
    expect(screen.getByText(/Add task/i)).toBeTruthy();
  });

  it("renders only inbox tasks newest first", async () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-old",
        title: "Older inbox item",
        createdAt: "2026-08-01T09:00:00.000Z",
      }),
      makeInboxTask({
        id: "task-inbox-new",
        title: "Newer inbox item",
        createdAt: "2026-08-05T09:00:00.000Z",
        priority: "high",
      }),
    );

    renderInbox({ state });
    await waitForHydration();

    expect(screen.getByText("2 tasks in Inbox")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Newer inbox item" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Older inbox item" })).toBeTruthy();
    expect(screen.queryByText("Approve Flow Gate specification")).toBeNull();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((node) => node.textContent);
    expect(headings.indexOf("Newer inbox item")).toBeLessThan(
      headings.indexOf("Older inbox item"),
    );
  });

  it("does not offer archived projects", async () => {
    const state = createPrototypeSeedState();
    state.projects = state.projects.map((project) =>
      project.id === PROJECT_ID_DMC_FLOW_PILOT
        ? { ...project, archived: true }
        : project,
    );
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-1",
        title: "Needs a project",
        createdAt: "2026-08-05T09:00:00.000Z",
      }),
    );

    renderInbox({ state });
    await waitForHydration();

    const select = screen.getByLabelText("Project");
    const options = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toContain("Cloud Platform");
    expect(options).not.toContain("DMC Flow Pilot");
  });

  it("disables Ready until a project is selected", async () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-1",
        title: "Unassigned",
        createdAt: "2026-08-05T09:00:00.000Z",
      }),
    );

    renderInbox({ state });
    await waitForHydration();

    const ready = screen.getByRole("button", {
      name: "Move Unassigned to Ready",
    });
    expect((ready as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Project"), {
      target: { value: PROJECT_ID_DMC_FLOW_PILOT },
    });

    expect((ready as HTMLButtonElement).disabled).toBe(false);
  });

  it("moves an inbox task to Ready and persists through remount", async () => {
    const now = new Date("2026-08-06T15:00:00.000Z");
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-triage",
        title: "Triage this",
        createdAt: "2026-08-05T09:00:00.000Z",
        priority: "high",
      }),
    );
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(state),
    });

    const { unmount } = renderInbox({
      storage,
      state,
      getNow: () => now,
    });
    await waitForHydration();

    fireEvent.change(screen.getByLabelText("Project"), {
      target: { value: PROJECT_ID_DMC_FLOW_PILOT },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Move Triage this to Ready" }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Triage this")).toBeNull();
      expect(screen.getByText("Task moved to Ready.")).toBeTruthy();
    });

    expect(screen.getByTestId("ready-tasks").textContent).toContain(
      `task-inbox-triage:${PROJECT_ID_DMC_FLOW_PILOT}:${now.toISOString()}`,
    );

    unmount();
    renderInbox({ storage });
    await waitForHydration();

    expect(screen.queryByText("Triage this")).toBeNull();
    expect(screen.getByTestId("ready-tasks").textContent).toContain(
      `task-inbox-triage:${PROJECT_ID_DMC_FLOW_PILOT}:${now.toISOString()}`,
    );
  });

  it("does not delete on the first Delete click", async () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-keep",
        title: "Keep for now",
        createdAt: "2026-08-05T09:00:00.000Z",
      }),
    );

    renderInbox({ state });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText(/Delete “Keep for now”/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeTruthy();
    expect(screen.getByTestId("task-ids").textContent).toContain("task-inbox-keep");
  });

  it("preserves the task when delete is cancelled", async () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-cancel",
        title: "Cancel delete",
        createdAt: "2026-08-05T09:00:00.000Z",
      }),
    );

    renderInbox({ state });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Cancel delete" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.getByTestId("task-ids").textContent).toContain("task-inbox-cancel");
  });

  it("removes a task on confirm and persists through remount", async () => {
    const state = createPrototypeSeedState();
    state.tasks.push(
      makeInboxTask({
        id: "task-inbox-delete",
        title: "Delete me",
        createdAt: "2026-08-05T09:00:00.000Z",
      }),
    );
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(state),
    });

    const { unmount } = renderInbox({ storage, state });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete me")).toBeNull();
      expect(screen.getByText("Task deleted.")).toBeTruthy();
    });
    expect(screen.getByTestId("task-ids").textContent).not.toContain(
      "task-inbox-delete",
    );

    unmount();
    renderInbox({ storage });
    await waitForHydration();

    expect(screen.queryByText("Delete me")).toBeNull();
    expect(screen.getByTestId("task-ids").textContent).not.toContain(
      "task-inbox-delete",
    );
  });
});
