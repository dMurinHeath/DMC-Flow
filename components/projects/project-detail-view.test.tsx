import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "@/components/prototype-store/prototype-store-provider";
import type { Project } from "@/lib/domain/project";
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
import { ProjectDetailView } from "./project-detail-view";

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
  projectId: string,
  options?: { state?: PrototypeState },
) {
  const seed = options?.state ?? createPrototypeSeedState();
  const storage = createMemoryStorage({
    [PROTOTYPE_STATE_STORAGE_KEY]: envelope(seed),
  });

  return render(
    <PrototypeStoreProvider storage={storage}>
      <ProjectDetailView projectId={projectId} getToday={() => "2026-08-06"} />
      <StoreProbe />
    </PrototypeStoreProvider>,
  );
}

async function waitForHydration() {
  await waitFor(() => {
    expect(screen.getByTestId("hydrated").textContent).toBe("true");
  });
}

describe("ProjectDetailView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not claim not-found before hydration completes", () => {
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {
      // Delay hydration intentionally.
    });

    render(
      <PrototypeStoreProvider storage={createMemoryStorage()}>
        <ProjectDetailView projectId="does-not-exist" />
        <StoreProbe />
      </PrototypeStoreProvider>,
    );

    expect(screen.getByRole("status").textContent).toMatch(/Loading project/i);
    expect(
      screen.queryByRole("heading", { name: "Project not found" }),
    ).toBeNull();
    expect(screen.getByTestId("hydrated").textContent).toBe("false");
  });

  it("shows recoverable not-found after hydration for unknown ids", async () => {
    renderDetail("does-not-exist");
    await waitForHydration();

    expect(
      screen.getByRole("heading", { name: "Project not found" }),
    ).toBeTruthy();
    const back = screen.getByRole("link", { name: "Back to Projects" });
    expect(back.getAttribute("href")).toBe("/projects");
  });

  it("lists seed pilot tasks with status cells and editors", async () => {
    renderDetail(PROJECT_ID_DMC_FLOW_PILOT);
    await waitForHydration();

    expect(
      screen.getByRole("heading", { name: "DMC Flow Pilot" }),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Edit Approve Flow Gate specification",
      }),
    ).toBeTruthy();
  });

  it("renders archived project tasks without TaskEditor and states why", async () => {
    const state = createPrototypeSeedState();
    state.projects = state.projects.map((project) =>
      project.id === PROJECT_ID_DMC_FLOW_PILOT
        ? { ...project, archived: true }
        : project,
    );
    const pilot = state.projects.find(
      (project: Project) => project.id === PROJECT_ID_DMC_FLOW_PILOT,
    );
    expect(pilot?.archived).toBe(true);

    const openTask = state.tasks.find(
      (task: Task) =>
        task.projectId === PROJECT_ID_DMC_FLOW_PILOT && task.status !== "done",
    );
    expect(openTask).toBeTruthy();
    expect(openTask?.ownerId).toBe(PROTOTYPE_OWNER_ID);

    renderDetail(PROJECT_ID_DMC_FLOW_PILOT, { state });
    await waitForHydration();

    expect(screen.getByText(/Archived/)).toBeTruthy();
    expect(
      screen.getByRole("status").textContent,
    ).toMatch(/archived, so tasks are read-only/i);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: /Edit Approve Flow Gate specification/,
      }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(screen.getByText(/cannot be kept on a task draft/i)).toBeTruthy();
  });

  it("shows empty state for a project with no tasks", async () => {
    const state = createPrototypeSeedState();
    state.projects.push({
      id: "proj-empty",
      name: "Empty Nest",
      description: "",
      health: "on_track",
      archived: false,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    });

    renderDetail("proj-empty", { state });
    await waitForHydration();

    expect(screen.getByText("No tasks in this project yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
