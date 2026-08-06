import Link from "next/link";
import type { ReactNode } from "react";
import type { Project } from "@/lib/domain/project";

const HEALTH_LABELS = {
  on_track: "On track",
  needs_attention: "Needs attention",
} as const;

export function ProjectHeader({ project }: { project: Project }): ReactNode {
  return (
    <header className="min-w-0">
      <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">
        <Link href="/projects" className="underline-offset-2 hover:underline">
          Projects
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy break-words lg:text-3xl">
        {project.name}
      </h1>
      {project.description ? (
        <p className="mt-2 text-sm text-muted lg:text-base break-words">
          {project.description}
        </p>
      ) : null}
      <p
        className={
          project.health === "needs_attention"
            ? "mt-2 text-sm text-amber"
            : "mt-2 text-sm text-teal"
        }
      >
        {HEALTH_LABELS[project.health]}
        {project.archived ? " · Archived" : null}
      </p>
    </header>
  );
}

export function ProjectArchivedNotice(): ReactNode {
  return (
    <p
      className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted"
      role="status"
    >
      This project is archived, so tasks are read-only here. Editing would fail
      because an archived project cannot be kept on a task draft. Restore the
      project from the Projects list to edit again.
    </p>
  );
}

export function ProjectNotFound(): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Project not found
      </h1>
      <p className="text-sm text-muted" role="status">
        This project is not in your workspace. It may have been removed, or the
        link may be incorrect.
      </p>
      <p>
        <Link
          href="/projects"
          className="text-sm font-medium text-teal underline-offset-2 hover:underline"
        >
          Back to Projects
        </Link>
      </p>
    </div>
  );
}
