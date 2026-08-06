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
import { allowedTransitions } from "@/lib/domain/task";
import {
  createPrototypeSeedState,
  PROJECT_ID_DMC_FLOW_PILOT,
} from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeState,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { ProjectBoardView } from "./project-board-view";

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
      <p data-testid="task-statuses">
        {state.tasks
          .map((task) => `${task.id}:${task.status}:${task.updatedAt}`)
          .join("|")}
      </p>
    </div>
  );
}

function renderBoard(
  projectId: string,
  options?: { state?: PrototypeState; getNow?: () => Date },
) {
  const seed = options?.state ?? createPrototypeSeedState();
  const storage = createMemoryStorage({
    [PROTOTYPE_STATE_STORAGE_KEY]: envelope(seed),
  });
  return render(
    <PrototypeStoreProvider storage={storage}>
      <ProjectBoardView
        projectId={projectId}
        getToday={() => "2026-08-06"}
        getNow={options?.getNow}
      />
      <StoreProbe />
    </PrototypeStoreProvider>,
  );
}

async function waitForHydration() {
  await waitFor(() => {
    expect(screen.getByTestId("hydrated").textContent).toBe("true");
  });
}

function stubDataTransfer(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    store,
    setData(type: string, value: string) {
      store[type] = value;
    },
    getData(type: string) {
      return store[type] ?? "";
    },
    effectAllowed: "all",
    dropEffect: "none",
  };
}

describe("ProjectBoardView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders only allowed transition buttons per card", async () => {
    renderBoard(PROJECT_ID_DMC_FLOW_PILOT);
    await waitForHydration();

    const readyCard = screen.getByRole("article", {
      name: /Define acceptance criteria, Ready/,
    });
    const titleLink = within(readyCard).getByRole("link", {
      name: "Define acceptance criteria",
    });
    expect(titleLink.getAttribute("href")).toBe(
      "/task?id=task-define-acceptance-criteria",
    );
    expect(titleLink.getAttribute("draggable")).toBe("false");
    const buttons = within(readyCard)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    const allowed = allowedTransitions("ready");
    expect(buttons).toHaveLength(allowed.length);
    expect(buttons).toContain("Move Define acceptance criteria to In progress");
    expect(buttons).not.toContain("Move Define acceptance criteria to Done");
  });

  it("moves a card via keyboard status actions without drag", async () => {
    const FIXED = new Date("2026-08-06T18:00:00.000Z");
    renderBoard(PROJECT_ID_DMC_FLOW_PILOT, { getNow: () => FIXED });
    await waitForHydration();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Move Define acceptance criteria to In progress",
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-statuses").textContent).toContain(
        `task-define-acceptance-criteria:in_progress:${FIXED.toISOString()}`,
      );
    });
    expect(
      screen.getByText(/Moved .* to In progress/),
    ).toBeTruthy();
  });

  it("dispatches on permitted drop and refuses forbidden drop", async () => {
    const FIXED = new Date("2026-08-06T19:00:00.000Z");
    renderBoard(PROJECT_ID_DMC_FLOW_PILOT, { getNow: () => FIXED });
    await waitForHydration();

    const transfer = stubDataTransfer();
    const readyArticle = screen.getByRole("article", {
      name: /Define acceptance criteria, Ready/,
    });
    fireEvent.dragStart(readyArticle, { dataTransfer: transfer });
    expect(transfer.getData("application/x-dmc-flow-task-id")).toBe(
      "task-define-acceptance-criteria",
    );

    const inProgress = screen.getByRole("heading", { name: /In progress/ });
    const inProgressColumn = inProgress.closest("section") as HTMLElement;
    fireEvent.dragOver(inProgressColumn, { dataTransfer: transfer });
    fireEvent.drop(inProgressColumn, { dataTransfer: transfer });

    await waitFor(() => {
      expect(screen.getByTestId("task-statuses").textContent).toContain(
        `task-define-acceptance-criteria:in_progress:${FIXED.toISOString()}`,
      );
    });

    const before = screen.getByTestId("task-statuses").textContent;
    const accessible = screen.getByRole("article", {
      name: /Accessible board movement, Ready/,
    });
    const transfer2 = stubDataTransfer();
    fireEvent.dragStart(accessible, { dataTransfer: transfer2 });
    const doneHeading = screen.getByRole("heading", { name: /Done/ });
    const doneColumn = doneHeading.closest("section") as HTMLElement;
    fireEvent.drop(doneColumn, { dataTransfer: transfer2 });

    await waitFor(() => {
      expect(screen.getByText(/Cannot move a ready task to done/i)).toBeTruthy();
    });
    expect(screen.getByTestId("task-statuses").textContent).toBe(before);
  });

  it("renders archived boards without status buttons or draggable", async () => {
    const state = createPrototypeSeedState();
    state.projects = state.projects.map((project) =>
      project.id === PROJECT_ID_DMC_FLOW_PILOT
        ? { ...project, archived: true }
        : project,
    );
    renderBoard(PROJECT_ID_DMC_FLOW_PILOT, { state });
    await waitForHydration();

    expect(
      screen.getByRole("status").textContent,
    ).toMatch(/archived, so tasks are read-only/i);
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
    const card = screen.getByRole("article", {
      name: /Approve Flow Gate specification/,
    });
    expect(card.getAttribute("draggable")).toBeNull();
  });
});
