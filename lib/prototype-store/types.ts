import type { Project } from "@/lib/domain/project";
import type { Task } from "@/lib/domain/task";

export const PROTOTYPE_STATE_STORAGE_KEY = "dmc-flow.prototype-state";
export const PROTOTYPE_STATE_VERSION = 1 as const;

export type PrototypeState = {
  tasks: Task[];
  projects: Project[];
};

export type PrototypeStateEnvelope = {
  version: typeof PROTOTYPE_STATE_VERSION;
  state: PrototypeState;
};

export type PrototypeStoreAction =
  | { type: "hydrate"; state: PrototypeState }
  | { type: "save_task"; task: Task }
  | { type: "remove_task"; taskId: string }
  | { type: "save_project"; project: Project }
  | { type: "reset" };

export type PrototypeStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
