import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectRouteParams } from "@/components/projects/project-route-params";

function ProjectBoardLoadingFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div
        className="rounded-md border border-border bg-surface px-4 py-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted">Loading project board…</p>
      </div>
    </div>
  );
}

export default function ProjectBoardPage() {
  return (
    <AppShell activeNav="projects">
      <Suspense fallback={<ProjectBoardLoadingFallback />}>
        <ProjectRouteParams view="board" />
      </Suspense>
    </AppShell>
  );
}
