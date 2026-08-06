import { describe, expect, it, vi, afterEach } from "vitest";
import {
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
import type { Project } from "@/lib/domain/project";
import {
  createPrototypeSeedState,
  PROJECT_ID_CLOUD_PLATFORM,
  PROJECT_ID_DMC_FLOW_PILOT,
} from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeState,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { ProjectsView } from "./projects-view";

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
  const { state, hydrated } = usePrototypeStore();
  return (
    <div>
      <p data-testid="hydrated">{String(hydrated)}</p>
      <p data-testid="project-ids">
        {state.projects.map((project) => project.id).join(",")}
      </p>
      <p data-testid="project-summary">
        {state.projects
          .map(
            (project) =>
              `${project.id}:${project.name}:${project.health}:${project.archived}:${project.updatedAt}`,
          )
          .join("|")}
      </p>
    </div>
  );
}

function emptyProject(
  partial: Partial<Project> & Pick<Project, "id" | "name">,
): Project {
  return {
    description: "",
    health: "on_track",
    archived: false,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...partial,
  };
}

function renderProjects(options?: {
  storage?: ReturnType<typeof createMemoryStorage>;
  state?: PrototypeState;
  createProjectIds?: () => { id: string; now: string };
  getNow?: () => Date;
}) {
  const seed = options?.state ?? createPrototypeSeedState();
  const storage =
    options?.storage ??
    createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(seed),
    });

  const view = render(
    <PrototypeStoreProvider storage={storage}>
      <ProjectsView
        createProjectIds={options?.createProjectIds}
        getNow={options?.getNow}
      />
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

describe("ProjectsView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before hydration", () => {
    const queued: Array<() => void> = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      queued.push(callback);
    });

    renderProjects({ storage: createMemoryStorage() });

    expect(screen.getByRole("status").textContent).toMatch(/Loading/i);
    expect(screen.getByTestId("hydrated").textContent).toBe("false");
  });

  it("lists active and archived projects after hydration", async () => {
    const state = createPrototypeSeedState();
    state.projects.push(
      emptyProject({
        id: "proj-old",
        name: "Legacy Board",
        archived: true,
      }),
    );

    renderProjects({ state });
    await waitForHydration();

    expect(screen.getByRole("heading", { name: "Active" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Archived" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cloud Platform" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "DMC Flow Pilot" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Legacy Board" })).toBeTruthy();

    const pilotLink = screen.getByRole("link", { name: "DMC Flow Pilot" });
    expect(pilotLink.getAttribute("href")).toBe(
      `/project?id=${PROJECT_ID_DMC_FLOW_PILOT}`,
    );
    const archivedLink = screen.getByRole("link", { name: "Legacy Board" });
    expect(archivedLink.getAttribute("href")).toBe("/project?id=proj-old");
  });

  it("creates a project via the expandable form", async () => {
    const FIXED_NOW = "2026-08-06T16:00:00.000Z";
    renderProjects({
      createProjectIds: () => ({ id: "proj-new", now: FIXED_NOW }),
    });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "  Ops Sync  " },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: " Weekly ops " },
    });
    fireEvent.change(screen.getByLabelText("Health"), {
      target: { value: "needs_attention" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ops Sync" })).toBeTruthy();
    });
    expect(screen.getByTestId("project-summary").textContent).toContain(
      `proj-new:Ops Sync:needs_attention:false:${FIXED_NOW}`,
    );
    expect(screen.getByText(/Created project/)).toBeTruthy();
  });

  it("edits a project name and health inline", async () => {
    const FIXED = new Date("2026-08-06T17:00:00.000Z");
    renderProjects({ getNow: () => FIXED });
    await waitForHydration();

    const cloudHeading = screen.getByRole("heading", { name: "Cloud Platform" });
    const row = cloudHeading.closest("li");
    expect(row).toBeTruthy();
    fireEvent.click(within(row as HTMLElement).getByRole("button", { name: "Edit" }));

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Cloud Platform Renamed" },
    });
    fireEvent.change(screen.getByLabelText("Health"), {
      target: { value: "on_track" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Cloud Platform Renamed" }),
      ).toBeTruthy();
    });
    expect(screen.getByTestId("project-summary").textContent).toContain(
      `${PROJECT_ID_CLOUD_PLATFORM}:Cloud Platform Renamed:on_track:false:${FIXED.toISOString()}`,
    );
  });

  it("refuses archive when open tasks remain", async () => {
    renderProjects();
    await waitForHydration();

    const pilotHeading = screen.getByRole("heading", { name: "DMC Flow Pilot" });
    const row = pilotHeading.closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Archive" }));
    fireEvent.click(
      within(row).getByRole("button", { name: "Confirm archive" }),
    );

    await waitFor(() => {
      expect(
        within(row).getByRole("alert").textContent,
      ).toMatch(/Cannot archive while \d+ open tasks/);
    });
    expect(screen.getByTestId("project-summary").textContent).toContain(
      `${PROJECT_ID_DMC_FLOW_PILOT}:DMC Flow Pilot:on_track:false:`,
    );
  });

  it("cancels then archives an empty project", async () => {
    const FIXED = new Date("2026-08-06T18:00:00.000Z");
    const state = createPrototypeSeedState();
    state.projects.push(
      emptyProject({
        id: "proj-empty",
        name: "Empty Nest",
        description: "Nothing assigned",
      }),
    );

    renderProjects({ state, getNow: () => FIXED });
    await waitForHydration();

    const heading = screen.getByRole("heading", { name: "Empty Nest" });
    const row = heading.closest("li") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Archive" }));
    expect(
      within(row).getByRole("button", { name: "Confirm archive" }),
    ).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Cancel" }));
    expect(within(row).getByRole("button", { name: "Archive" })).toBeTruthy();

    fireEvent.click(within(row).getByRole("button", { name: "Archive" }));
    fireEvent.click(
      within(row).getByRole("button", { name: "Confirm archive" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("project-summary").textContent).toContain(
        `proj-empty:Empty Nest:on_track:true:${FIXED.toISOString()}`,
      );
    });

    const archivedSection = screen
      .getByRole("heading", { name: "Archived" })
      .closest("section") as HTMLElement;
    expect(
      within(archivedSection).getByRole("heading", { name: "Empty Nest" }),
    ).toBeTruthy();
  });

  it("restores an archived project", async () => {
    const FIXED = new Date("2026-08-06T19:00:00.000Z");
    const state = createPrototypeSeedState();
    state.projects.push(
      emptyProject({
        id: "proj-restorable",
        name: "Restorable",
        archived: true,
      }),
    );

    renderProjects({ state, getNow: () => FIXED });
    await waitForHydration();

    const archivedSection = screen
      .getByRole("heading", { name: "Archived" })
      .closest("section") as HTMLElement;
    const row = within(archivedSection)
      .getByRole("heading", { name: "Restorable" })
      .closest("li") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Restore" }));

    await waitFor(() => {
      expect(screen.getByTestId("project-summary").textContent).toContain(
        `proj-restorable:Restorable:on_track:false:${FIXED.toISOString()}`,
      );
    });

    const activeSection = screen
      .getByRole("heading", { name: "Active" })
      .closest("section") as HTMLElement;
    expect(
      within(activeSection).getByRole("heading", { name: "Restorable" }),
    ).toBeTruthy();
  });

  it("shows validation when create name is empty", async () => {
    renderProjects();
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(screen.getByRole("alert").textContent).toBe("Name is required.");
  });
});
