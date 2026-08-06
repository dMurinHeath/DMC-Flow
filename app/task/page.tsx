import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { TaskRouteParams } from "@/components/task/task-route-params";

function TaskLoadingFallback() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div
        className="rounded-md border border-border bg-surface px-4 py-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted">Loading task…</p>
      </div>
    </div>
  );
}

export default function TaskPage() {
  return (
    <AppShell activeNav="my-flow">
      <Suspense fallback={<TaskLoadingFallback />}>
        <TaskRouteParams />
      </Suspense>
    </AppShell>
  );
}
