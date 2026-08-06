// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  loadPrototypeState,
  parsePrototypeStateEnvelope,
  savePrototypeState,
} from "./persistence";
import { createPrototypeSeedState } from "./seed";
import type { PrototypeStorage } from "./types";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
} from "./types";

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

describe("prototype persistence", () => {
  it("round-trips valid version-1 data", () => {
    const storage = createMemoryStorage();
    const state = createPrototypeSeedState();
    savePrototypeState(storage, state);

    const raw = JSON.parse(storage.store[PROTOTYPE_STATE_STORAGE_KEY]!);
    expect(raw.version).toBe(PROTOTYPE_STATE_VERSION);
    expect(parsePrototypeStateEnvelope(raw)?.tasks).toHaveLength(state.tasks.length);
    expect(loadPrototypeState(storage).tasks).toHaveLength(state.tasks.length);
  });

  it("falls back to seed for missing, malformed, wrong-version and invalid data", () => {
    const seedCount = createPrototypeSeedState().tasks.length;

    expect(loadPrototypeState(createMemoryStorage()).tasks).toHaveLength(seedCount);

    expect(
      loadPrototypeState(
        createMemoryStorage({ [PROTOTYPE_STATE_STORAGE_KEY]: "{not-json" }),
      ).tasks,
    ).toHaveLength(seedCount);

    expect(
      loadPrototypeState(
        createMemoryStorage({
          [PROTOTYPE_STATE_STORAGE_KEY]: JSON.stringify({
            version: 2,
            state: createPrototypeSeedState(),
          }),
        }),
      ).tasks,
    ).toHaveLength(seedCount);

    const invalid = createPrototypeSeedState();
    invalid.tasks[0] = {
      ...invalid.tasks[0]!,
      status: "blocked" as never,
    };
    expect(
      loadPrototypeState(
        createMemoryStorage({
          [PROTOTYPE_STATE_STORAGE_KEY]: JSON.stringify({
            version: 1,
            state: invalid,
          }),
        }),
      ).tasks,
    ).toHaveLength(seedCount);
  });

  it("does not escape storage read or write exceptions", () => {
    const seedCount = createPrototypeSeedState().tasks.length;
    const throwingRead: PrototypeStorage = {
      getItem() {
        throw new Error("read failed");
      },
      setItem() {},
    };
    expect(loadPrototypeState(throwingRead).tasks).toHaveLength(seedCount);

    const throwingWrite: PrototypeStorage = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("write failed");
      },
    };
    expect(() =>
      savePrototypeState(throwingWrite, createPrototypeSeedState()),
    ).not.toThrow();
  });
});
