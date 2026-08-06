import type { Project } from "@/lib/domain/project";
import {
  canTransitionTaskStatus,
  type Task,
} from "@/lib/domain/task";

export type MoveInboxTaskToReadyInput = {
  task: Task;
  projectId: string;
  projects: readonly Project[];
  now: string;
};

export type MoveInboxTaskToReadyResult =
  | { ok: true; task: Task }
  | { ok: false; message: string };

export function selectInboxTasks(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((task) => task.status === "inbox")
    .map((task) => ({ ...task }))
    .sort((left, right) => {
      if (left.createdAt === right.createdAt) {
        return right.id.localeCompare(left.id);
      }
      return right.createdAt.localeCompare(left.createdAt);
    });
}

export function moveInboxTaskToReady(
  input: MoveInboxTaskToReadyInput,
): MoveInboxTaskToReadyResult {
  const { task, projectId, projects, now } = input;

  if (task.status !== "inbox") {
    return { ok: false, message: "Only Inbox tasks can be moved to Ready." };
  }

  if (!canTransitionTaskStatus("inbox", "ready")) {
    return {
      ok: false,
      message: "Inbox tasks cannot transition to Ready.",
    };
  }

  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) {
    return { ok: false, message: "Choose an active project." };
  }

  if (project.archived) {
    return {
      ok: false,
      message: "Choose an active project that is not archived.",
    };
  }

  return {
    ok: true,
    task: {
      ...task,
      projectId: project.id,
      status: "ready",
      updatedAt: now,
    },
  };
}
