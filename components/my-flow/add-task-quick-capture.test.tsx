import { describe, expect, it, vi, afterEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "@/components/prototype-store/prototype-store-provider";
import { createPrototypeSeedState } from "@/lib/prototype-store/seed";
import {
  PROTOTYPE_OWNER_ID,
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
  type PrototypeStorage,
} from "@/lib/prototype-store/types";
import { TASK_TITLE_MAX_LENGTH } from "@/lib/domain/task";
import {
  AddTaskQuickCapture,
  type CreateTaskIds,
} from "./add-task-quick-capture";

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

function StoreTaskCount() {
  const { state } = usePrototypeStore();
  return <p data-testid="task-count">{state.tasks.length}</p>;
}

function renderCapture(options?: {
  storage?: ReturnType<typeof createMemoryStorage>;
  createTaskIds?: CreateTaskIds;
}) {
  const storage = options?.storage ?? createMemoryStorage();
  const view = render(
    <PrototypeStoreProvider storage={storage}>
      <AddTaskQuickCapture createTaskIds={options?.createTaskIds} />
      <StoreTaskCount />
    </PrototypeStoreProvider>,
  );
  return { ...view, storage };
}

async function waitForEnabledTrigger() {
  const triggers = () =>
    screen.getAllByRole("button", { name: "Add task" });
  await waitFor(() => {
    expect(
      triggers().some((button) => !(button as HTMLButtonElement).disabled),
    ).toBe(true);
  });
  return triggers().find(
    (button) => !(button as HTMLButtonElement).disabled,
  ) as HTMLButtonElement;
}

describe("AddTaskQuickCapture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables Add task before hydration and enables it afterward", async () => {
    const queued: Array<() => void> = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      queued.push(callback);
    });

    renderCapture();
    const trigger = screen.getByRole("button", { name: "Add task" });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      for (const callback of queued) {
        callback();
      }
    });

    await waitFor(() => {
      expect((trigger as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("opens the form and focuses the title input", async () => {
    renderCapture();
    const trigger = await waitForEnabledTrigger();
    act(() => {
      fireEvent.click(trigger);
    });
    const input = screen.getByLabelText("Task title");
    expect(input).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe("add-task-quick-capture");
  });

  it("shows accessible validation for blank, whitespace-only and over-long titles without saving", async () => {
    renderCapture();
    const seedCount = createPrototypeSeedState().tasks.length;
    const trigger = await waitForEnabledTrigger();

    act(() => {
      fireEvent.click(trigger);
    });

    const form = screen.getByRole("form", { name: "Add task" });
    act(() => {
      fireEvent.submit(form);
    });
    expect(screen.getByRole("alert").textContent).toBe("Title is required.");
    expect(screen.getByLabelText("Task title").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByTestId("task-count").textContent).toBe(String(seedCount));

    const input = screen.getByLabelText("Task title") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.submit(form);
    });
    expect(screen.getByRole("alert").textContent).toBe("Title is required.");
    expect(input.value).toBe("   ");
    expect(screen.getByTestId("task-count").textContent).toBe(String(seedCount));

    const overMax = "a".repeat(TASK_TITLE_MAX_LENGTH + 1);
    act(() => {
      fireEvent.change(input, { target: { value: overMax } });
      fireEvent.submit(form);
    });
    expect(screen.getByRole("alert").textContent).toBe(
      `Title must be at most ${TASK_TITLE_MAX_LENGTH} characters.`,
    );
    expect(input.value).toBe(overMax);
    expect(input.getAttribute("aria-describedby")).toBe(
      "add-task-quick-capture-error",
    );
    expect(screen.getByTestId("task-count").textContent).toBe(String(seedCount));
  });

  it("cancels without saving and returns focus to the trigger", async () => {
    renderCapture();
    const seedCount = createPrototypeSeedState().tasks.length;
    const trigger = await waitForEnabledTrigger();
    act(() => {
      fireEvent.click(trigger);
    });
    const input = screen.getByLabelText("Task title") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "Draft title" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(screen.queryByRole("form", { name: "Add task" })).toBeNull();
    expect(screen.getByTestId("task-count").textContent).toBe(String(seedCount));
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("cancels on Escape while focus is in the form", async () => {
    renderCapture();
    const trigger = await waitForEnabledTrigger();
    act(() => {
      fireEvent.click(trigger);
    });
    const form = screen.getByRole("form", { name: "Add task" });
    act(() => {
      fireEvent.keyDown(form, { key: "Escape" });
    });
    expect(screen.queryByRole("form", { name: "Add task" })).toBeNull();
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("creates exactly one correctly defaulted Inbox task that survives remount", async () => {
    const storage = createMemoryStorage();
    const createTaskIds: CreateTaskIds = () => ({
      id: "task-inbox-1",
      now: "2026-08-06T15:00:00.000Z",
    });
    const seedCount = createPrototypeSeedState().tasks.length;

    const view = renderCapture({ storage, createTaskIds });
    const trigger = await waitForEnabledTrigger();
    act(() => {
      fireEvent.click(trigger);
    });

    const input = screen.getByLabelText("Task title") as HTMLInputElement;
    const form = screen.getByRole("form", { name: "Add task" });
    act(() => {
      fireEvent.change(input, { target: { value: "  Capture inbox item  " } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-count").textContent).toBe(
        String(seedCount + 1),
      );
    });
    expect(screen.queryByRole("form", { name: "Add task" })).toBeNull();
    expect(screen.getByText("Task added to Inbox.")).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });

    const persisted = JSON.parse(storage.store[PROTOTYPE_STATE_STORAGE_KEY]!);
    expect(persisted.version).toBe(PROTOTYPE_STATE_VERSION);
    const saved = persisted.state.tasks.find(
      (task: { id: string }) => task.id === "task-inbox-1",
    );
    expect(saved).toEqual({
      id: "task-inbox-1",
      title: "Capture inbox item",
      projectId: null,
      status: "inbox",
      priority: "medium",
      ownerId: PROTOTYPE_OWNER_ID,
      dueDate: null,
      riskRoute: "standard",
      blockedReason: null,
      createdAt: "2026-08-06T15:00:00.000Z",
      updatedAt: "2026-08-06T15:00:00.000Z",
    });

    view.unmount();

    render(
      <PrototypeStoreProvider storage={storage}>
        <StoreTaskCount />
      </PrototypeStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-count").textContent).toBe(
        String(seedCount + 1),
      );
    });
  });
});
