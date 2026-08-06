import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from "@/components/prototype-store/prototype-store-provider";
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

const searchParamsState = vi.hoisted(() => ({
  id: null as string | null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get(key: string) {
      if (key === "id") {
        return searchParamsState.id;
      }
      return null;
    },
  }),
}));

import { ProjectRouteParams } from "./project-route-params";

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

async function waitForHydration() {
  await waitFor(() => {
    expect(screen.getByTestId("hydrated").textContent).toBe("true");
  });
}

describe("ProjectRouteParams", () => {
  beforeEach(() => {
    searchParamsState.id = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders not-found when id is absent", async () => {
    searchParamsState.id = null;
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(createPrototypeSeedState()),
    });

    render(
      <PrototypeStoreProvider storage={storage}>
        <ProjectRouteParams view="list" />
        <StoreProbe />
      </PrototypeStoreProvider>,
    );
    await waitForHydration();

    expect(
      screen.getByRole("heading", { name: "Project not found" }),
    ).toBeTruthy();
  });

  it("renders the project for a valid id", async () => {
    searchParamsState.id = PROJECT_ID_DMC_FLOW_PILOT;
    const storage = createMemoryStorage({
      [PROTOTYPE_STATE_STORAGE_KEY]: envelope(createPrototypeSeedState()),
    });

    render(
      <PrototypeStoreProvider storage={storage}>
        <ProjectRouteParams view="list" />
        <StoreProbe />
      </PrototypeStoreProvider>,
    );
    await waitForHydration();

    expect(
      screen.getByRole("heading", { name: "DMC Flow Pilot" }),
    ).toBeTruthy();
  });
});
