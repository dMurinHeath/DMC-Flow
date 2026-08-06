import { createPrototypeSeedState } from "./seed";
import type { PrototypeState, PrototypeStoreAction } from "./types";

function upsertById<T extends { id: string }>(
  items: readonly T[],
  item: T,
): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) {
    return [...items, item];
  }

  const next = [...items];
  next[index] = item;
  return next;
}

export function reducePrototypeState(
  state: PrototypeState,
  action: PrototypeStoreAction,
): PrototypeState {
  switch (action.type) {
    case "hydrate":
      return {
        tasks: action.state.tasks.map((task) => ({ ...task })),
        projects: action.state.projects.map((project) => ({ ...project })),
      };
    case "save_task":
      return {
        ...state,
        tasks: upsertById(state.tasks, { ...action.task }),
      };
    case "remove_task":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.taskId),
      };
    case "save_project":
      return {
        ...state,
        projects: upsertById(state.projects, { ...action.project }),
      };
    case "reset":
      return createPrototypeSeedState();
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
