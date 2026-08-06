import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectRouteParams } from "@/components/projects/project-route-params";

function ProjectLoadingFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div
        className="rounded-md border border-border bg-surface px-4 py-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted">Loading project…</p>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <AppShell activeNav="projects">
      <Suspense fallback={<ProjectLoadingFallback />}>
        <ProjectRouteParams view="list" />
      </Suspense>
    </AppShell>
  );
}
