import type { Project, ProjectDraft } from "@/lib/domain/project";
import type { Task } from "@/lib/domain/task";

export function createProject(input: {
  draft: ProjectDraft;
  id: string;
  now: string;
}): Project {
  const name = input.draft.name.trim();
  const description = input.draft.description.trim();
  return {
    id: input.id,
    name,
    description,
    health: input.draft.health,
    archived: false,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function selectActiveProjects(projects: readonly Project[]): Project[] {
  return projects
    .filter((project) => project.archived === false)
    .map((project) => ({ ...project }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function selectArchivedProjects(projects: readonly Project[]): Project[] {
  return projects
    .filter((project) => project.archived === true)
    .map((project) => ({ ...project }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function countOpenTasksForProject(
  tasks: readonly Task[],
  projectId: string,
): number {
  return tasks.filter(
    (task) => task.projectId === projectId && task.status !== "done",
  ).length;
}

export type ArchiveProjectResult =
  | { ok: true; project: Project }
  | { ok: false; message: string };

export function archiveProject(input: {
  project: Project;
  tasks: readonly Task[];
  now: string;
}): ArchiveProjectResult {
  if (input.project.archived) {
    return { ok: false, message: "This project is already archived." };
  }

  const openCount = countOpenTasksForProject(input.tasks, input.project.id);
  if (openCount > 0) {
    return {
      ok: false,
      message:
        openCount === 1
          ? "Cannot archive while 1 open task is still assigned to this project."
          : `Cannot archive while ${openCount} open tasks are still assigned to this project.`,
    };
  }

  return {
    ok: true,
    project: {
      ...input.project,
      archived: true,
      updatedAt: input.now,
    },
  };
}

export function restoreProject(input: {
  project: Project;
  now: string;
}): Project {
  return {
    ...input.project,
    archived: false,
    updatedAt: input.now,
  };
}
