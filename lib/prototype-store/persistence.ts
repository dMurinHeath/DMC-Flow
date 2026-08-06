import { isProject } from "@/lib/domain/project";
import { isTask } from "@/lib/domain/task";
import { createPrototypeSeedState } from "./seed";
import type {
  PrototypeState,
  PrototypeStateEnvelope,
  PrototypeStorage,
} from "./types";
import {
  PROTOTYPE_STATE_STORAGE_KEY,
  PROTOTYPE_STATE_VERSION,
} from "./types";

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

export function parsePrototypeStateEnvelope(
  input: unknown,
): PrototypeState | null {
  if (!isPlainObject(input)) {
    return null;
  }

  if (input.version !== PROTOTYPE_STATE_VERSION) {
    return null;
  }

  if (!isPlainObject(input.state)) {
    return null;
  }

  const { tasks, projects } = input.state;
  if (!Array.isArray(tasks) || !Array.isArray(projects)) {
    return null;
  }

  if (!tasks.every(isTask) || !projects.every(isProject)) {
    return null;
  }

  return {
    tasks: tasks.map((task) => ({ ...task })),
    projects: projects.map((project) => ({ ...project })),
  };
}

export function loadPrototypeState(storage: PrototypeStorage): PrototypeState {
  try {
    const raw = storage.getItem(PROTOTYPE_STATE_STORAGE_KEY);
    if (raw === null) {
      return createPrototypeSeedState();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return createPrototypeSeedState();
    }

    const state = parsePrototypeStateEnvelope(parsed);
    return state ?? createPrototypeSeedState();
  } catch {
    return createPrototypeSeedState();
  }
}

export function savePrototypeState(
  storage: PrototypeStorage,
  state: PrototypeState,
): void {
  try {
    const envelope: PrototypeStateEnvelope = {
      version: PROTOTYPE_STATE_VERSION,
      state: {
        tasks: state.tasks.map((task) => ({ ...task })),
        projects: state.projects.map((project) => ({ ...project })),
      },
    };
    storage.setItem(PROTOTYPE_STATE_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Continue in memory when persistence fails.
  }
}

export function createBrowserPrototypeStorage(): PrototypeStorage {
  return {
    getItem(key) {
      if (typeof window === "undefined") {
        return null;
      }
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.setItem(key, value);
    },
  };
}
