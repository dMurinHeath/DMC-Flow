import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "@/components/prototype-store/prototype-store-provider";
import {
  PROJECT_ID_CLOUD_PLATFORM,
  createPrototypeSeedState,
} from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeState,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { TaskEditor } from "./task-editor";

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
  const task = state.tasks.find((item) => item.id === "task-approve-flow-gate");
  return (
    <div>
      <p data-testid="hydrated">{String(hydrated)}</p>
      <p data-testid="priority">{task?.priority ?? ""}</p>
      <p data-testid="status">{task?.status ?? ""}</p>
      <p data-testid="project">{task?.projectId ?? ""}</p>
      <p data-testid="blocked">{task?.blockedReason ?? ""}</p>
      <p data-testid="updated">{task?.updatedAt ?? ""}</p>
      <p data-testid="task-ids">
        {state.tasks.map((item) => item.id).join(",")}
      </p>
    </div>
  );
}

function renderEditor(options?: {
  taskId?: string;
  state?: PrototypeState;
  storage?: ReturnType<typeof createMemoryStorage>;
  getNow?: () => Date;
  defaultOpen?: boolean;
}) {
  const state = options?.state ?? createPrototypeSeedState();
  const storage =
    options?.storage ??
    createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(state),
    });
  const taskId = options?.taskId ?? "task-approve-flow-gate";

  const view = render(
    <PrototypeStoreProvider storage={storage}>
      <TaskEditor
        taskId={taskId}
        getNow={options?.getNow}
        defaultOpen={options?.defaultOpen}
      />
      <StoreProbe />
    </PrototypeStoreProvider>,
  );
  return { ...view, storage, state, taskId };
}

async function waitForHydration() {
  await waitFor(() => {
    expect(screen.getByTestId("hydrated").textContent).toBe("true");
  });
}

describe("TaskEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves field edits and persists through remount", async () => {
    const now = new Date("2026-08-06T16:00:00.000Z");
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(createPrototypeSeedState()),
    });
    const { unmount } = renderEditor({ storage, getNow: () => now });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: /Edit / }));
    fireEvent.change(screen.getByLabelText("Priority"), {
      target: { value: "low" },
    });
    fireEvent.change(screen.getByLabelText("Project"), {
      target: { value: PROJECT_ID_CLOUD_PLATFORM },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Task saved.")).toBeTruthy();
      expect(screen.getByTestId("priority").textContent).toBe("low");
      expect(screen.getByTestId("project").textContent).toBe(
        PROJECT_ID_CLOUD_PLATFORM,
      );
      expect(screen.getByTestId("updated").textContent).toBe(now.toISOString());
    });

    unmount();
    renderEditor({ storage, getNow: () => now });
    await waitForHydration();
    expect(screen.getByTestId("priority").textContent).toBe("low");
    expect(screen.getByTestId("project").textContent).toBe(
      PROJECT_ID_CLOUD_PLATFORM,
    );
  });

  it("offers only permitted status transitions", async () => {
    renderEditor();
    await waitForHydration();
    fireEvent.click(screen.getByRole("button", { name: /Edit / }));

    expect(
      screen.getByRole("button", {
        name: "Move Approve Flow Gate specification to Ready",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Move Approve Flow Gate specification to Review",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Move Approve Flow Gate specification to Done",
      }),
    ).toBeNull();
  });

  it("moves status and announces the outcome", async () => {
    const now = new Date("2026-08-06T16:30:00.000Z");
    renderEditor({ getNow: () => now });
    await waitForHydration();
    fireEvent.click(screen.getByRole("button", { name: /Edit / }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Move Approve Flow Gate specification to Review",
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("review");
      expect(screen.getByText(/Task moved to review/i)).toBeTruthy();
    });
  });

  it("sets a blocked reason on save", async () => {
    renderEditor({ defaultOpen: true });
    await waitForHydration();
    fireEvent.change(screen.getByLabelText("Blocked reason"), {
      target: { value: "Waiting on decision" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.getByTestId("blocked").textContent).toBe(
        "Waiting on decision",
      );
    });
  });

  it("requires confirmation before delete and cancels safely", async () => {
    renderEditor({ defaultOpen: true });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeTruthy();
    expect(screen.getByTestId("task-ids").textContent).toContain(
      "task-approve-flow-gate",
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("task-ids").textContent).toContain(
      "task-approve-flow-gate",
    );
  });

  it("deletes on confirm and persists through remount", async () => {
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(createPrototypeSeedState()),
    });
    const { unmount } = renderEditor({ storage, defaultOpen: true });
    await waitForHydration();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(screen.getByText("Task deleted.")).toBeTruthy();
      expect(screen.getByTestId("task-ids").textContent).not.toContain(
        "task-approve-flow-gate",
      );
    });

    unmount();
    renderEditor({ storage, defaultOpen: true });
    await waitForHydration();
    expect(screen.getByTestId("task-ids").textContent).not.toContain(
      "task-approve-flow-gate",
    );
  });

  it("cancels with Escape and returns focus to Edit", async () => {
    renderEditor();
    await waitForHydration();
    const edit = screen.getByRole("button", { name: /Edit/ });
    fireEvent.click(edit);
    const form = screen.getByLabelText("Title").closest("form");
    expect(form).toBeTruthy();
    fireEvent.keyDown(form as HTMLFormElement, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByLabelText("Title")).toBeNull();
    });
    expect(document.activeElement).toBe(edit);
  });
});
