import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "@/components/prototype-store/prototype-store-provider";
import type { Task } from "@/lib/domain/task";
import {
  createPrototypeSeedState,
  PROJECT_ID_DMC_FLOW_PILOT,
} from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_OWNER_ID,
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeState,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { TaskDetailView } from "./task-detail-view";

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

function StoreProbe() {
  const { hydrated } = usePrototypeStore();
  return <p data-testid="hydrated">{String(hydrated)}</p>;
}

function renderDetail(
  taskId: string,
  options?: { state?: PrototypeState },
) {
  const seed = options?.state ?? createPrototypeSeedState();
  const storage = createMemoryStorage({
    [PROTOTYPE_STATE_STORAGE_KEY]: envelope(seed),
  });

  return render(
    <PrototypeStoreProvider storage={storage}>
      <TaskDetailView taskId={taskId} getToday={() => "2026-08-06"} />
      <StoreProbe />
    </PrototypeStoreProvider>,
  );
}

async function waitForHydration() {
  await waitFor(() => {
    expect(screen.getByTestId("hydrated").textContent).toBe("true");
  });
}

describe("TaskDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not claim not-found before hydration completes", () => {
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {
      // Delay hydration intentionally.
    });

    render(
      <PrototypeStoreProvider storage={createMemoryStorage()}>
        <TaskDetailView taskId="does-not-exist" />
        <StoreProbe />
      </PrototypeStoreProvider>,
    );

    expect(screen.getByRole("status").textContent).toMatch(/Loading task/i);
    expect(
      screen.queryByRole("heading", { name: "Task not found" }),
    ).toBeNull();
    expect(screen.getByTestId("hydrated").textContent).toBe("false");
  });

  it("shows recoverable not-found after hydration for unknown ids", async () => {
    renderDetail("does-not-exist");
    await waitForHydration();

    expect(
      screen.getByRole("heading", { name: "Task not found" }),
    ).toBeTruthy();
    const back = screen.getByRole("link", { name: "Back to My Flow" });
    expect(back.getAttribute("href")).toBe("/");
  });

  it("renders title, status, priority, owner, due, risk route and both timestamps", async () => {
    const state = createPrototypeSeedState();
    const task = state.tasks.find(
      (candidate) => candidate.id === "task-approve-flow-gate",
    );
    expect(task).toBeDefined();

    renderDetail("task-approve-flow-gate", { state });
    await waitForHydration();

    expect(
      screen.getByRole("heading", { name: task!.title, level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
    expect(screen.getByLabelText("Owner DM")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("Controlled")).toBeTruthy();

    const created = document.querySelector(`time[datetime="${task!.createdAt}"]`);
    const updated = document.querySelector(`time[datetime="${task!.updatedAt}"]`);
    expect(created).toBeTruthy();
    expect(updated).toBeTruthy();
  });

  it("shows blocked reason text for a blocked task, not merely a marker", async () => {
    renderDetail("task-review-aws-deployment");
    await waitForHydration();

    expect(
      screen.getByText("Waiting on architecture decision"),
    ).toBeTruthy();
    expect(screen.queryByText(/^Blocked$/)).toBeNull();
  });

  it("renders a task in an archived project with no TaskEditor and states why", async () => {
    const state = createPrototypeSeedState();
    state.projects = state.projects.map((project) =>
      project.id === PROJECT_ID_DMC_FLOW_PILOT
        ? { ...project, archived: true }
        : project,
    );

    renderDetail("task-approve-flow-gate", { state });
    await waitForHydration();

    expect(
      screen.getByRole("heading", {
        name: "Approve Flow Gate specification",
        level: 1,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(
      /archived project.*read-only/i,
    );
    expect(
      screen.queryByRole("button", {
        name: /Edit Approve Flow Gate specification/,
      }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
  });

  it("opens an archived-project task without throwing and without editing", async () => {
    const state = createPrototypeSeedState();
    state.projects = state.projects.map((project) =>
      project.id === PROJECT_ID_DMC_FLOW_PILOT
        ? { ...project, archived: true }
        : project,
    );
    const task = state.tasks.find(
      (candidate: Task) =>
        candidate.projectId === PROJECT_ID_DMC_FLOW_PILOT &&
        candidate.ownerId === PROTOTYPE_OWNER_ID,
    );
    expect(task).toBeDefined();

    expect(() => {
      renderDetail(task!.id, { state });
    }).not.toThrow();
    await waitForHydration();

    expect(screen.getByRole("heading", { name: task!.title, level: 1 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/read-only/i);
  });
});
