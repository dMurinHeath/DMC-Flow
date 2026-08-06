import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "./prototype-store-provider";
import { createPrototypeSeedState } from "@/lib/prototype-store/seed";
import type { PrototypeStorage } from "@/lib/prototype-store/types";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
} from "@/lib/prototype-store/types";

function createMemoryStorage(
  initial: Record<string, string> = {},
): PrototypeStorage & {
  store: Record<string, string>;
  setItemCalls: Array<{ key: string; value: string }>;
} {
  const store = { ...initial };
  const setItemCalls: Array<{ key: string; value: string }> = [];
  return {
    store,
    setItemCalls,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
    },
    setItem(key, value) {
      setItemCalls.push({ key, value });
      store[key] = value;
    },
  };
}

function StoreProbe() {
  const { state, hydrated, dispatch } = usePrototypeStore();
  return (
    <div>
      <p data-testid="hydrated">{String(hydrated)}</p>
      <p data-testid="task-count">{state.tasks.length}</p>
      <p data-testid="first-title">{state.tasks[0]?.title ?? ""}</p>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: "save_task",
            task: {
              ...state.tasks[0]!,
              title: "Persisted after hydrate",
            },
          })
        }
      >
        mutate
      </button>
    </div>
  );
}

describe("PrototypeStoreProvider", () => {
  it("renders children", () => {
    render(
      <PrototypeStoreProvider storage={createMemoryStorage()}>
        <p>child content</p>
      </PrototypeStoreProvider>,
    );
    expect(screen.getByText("child content")).toBeTruthy();
  });

  it("loads valid stored state after mounting and exposes hydration status", async () => {
    const seed = createPrototypeSeedState();
    const stored = {
      ...seed,
      tasks: seed.tasks.map((task, index) =>
        index === 0 ? { ...task, title: "Stored title" } : task,
      ),
    };
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: JSON.stringify({
        version: PROTOTYPE_STATE_VERSION,
        state: stored,
      }),
    });

    render(
      <PrototypeStoreProvider storage={storage}>
        <StoreProbe />
      </PrototypeStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });
    expect(screen.getByTestId("first-title").textContent).toBe("Stored title");
  });

  it("does not overwrite valid persisted state before hydration", async () => {
    const seed = createPrototypeSeedState();
    const seedFirstTitle = seed.tasks[0]!.title;
    const stored = {
      ...seed,
      tasks: seed.tasks.map((task, index) =>
        index === 0 ? { ...task, title: "Keep me" } : task,
      ),
    };
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: JSON.stringify({
        version: PROTOTYPE_STATE_VERSION,
        state: stored,
      }),
    });

    render(
      <PrototypeStoreProvider storage={storage}>
        <StoreProbe />
      </PrototypeStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });

    expect(screen.getByTestId("first-title").textContent).toBe("Keep me");

    const wroteSeedBeforeHydrate = storage.setItemCalls.some((call) => {
      try {
        const parsed = JSON.parse(call.value) as {
          state?: { tasks?: Array<{ title?: string }> };
        };
        return parsed.state?.tasks?.[0]?.title === seedFirstTitle;
      } catch {
        return false;
      }
    });
    expect(wroteSeedBeforeHydrate).toBe(false);

    const parsed = JSON.parse(storage.store[PROTOTYPE_STATE_STORAGE_KEY]!);
    expect(parsed.state.tasks[0].title).toBe("Keep me");
  });

  it("persists a later dispatched change and survives remount", async () => {
    const storage = createMemoryStorage();

    const view = render(
      <PrototypeStoreProvider storage={storage}>
        <StoreProbe />
      </PrototypeStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });

    act(() => {
      screen.getByRole("button", { name: "mutate" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("first-title").textContent).toBe(
        "Persisted after hydrate",
      );
    });

    const persisted = storage.store[PROTOTYPE_STATE_STORAGE_KEY];
    expect(persisted).toBeTruthy();

    view.unmount();

    render(
      <PrototypeStoreProvider storage={storage}>
        <StoreProbe />
      </PrototypeStoreProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hydrated").textContent).toBe("true");
    });
    expect(screen.getByTestId("first-title").textContent).toBe(
      "Persisted after hydrate",
    );
  });
});
