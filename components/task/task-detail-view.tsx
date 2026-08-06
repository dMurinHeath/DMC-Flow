"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import { taskStatusLabel } from "@/components/task/task-status-actions";
import { TaskEditor } from "@/components/task/task-editor";
import type { TaskPriority, TaskRiskRoute } from "@/lib/domain/task";
import { buildTaskDetail } from "@/lib/prototype-store/task-detail";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const RISK_ROUTE_LABELS: Record<TaskRiskRoute, string> = {
  standard: "Standard",
  controlled: "Controlled",
  restricted: "Restricted",
};

function defaultGetToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

type TaskDetailViewProps = {
  taskId: string;
  getToday?: () => string;
};

export function TaskDetailView({
  taskId,
  getToday = defaultGetToday,
}: TaskDetailViewProps) {
  const { state, hydrated } = usePrototypeStore();
  const [announcement, setAnnouncement] = useState("");

  if (!hydrated) {
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

  const result = buildTaskDetail(state, {
    taskId,
    today: getToday(),
  });

  if (!result.ok) {
    return <TaskNotFound />;
  }

  const { data } = result;
  const { task } = data;
  const readOnly = data.projectArchived;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">
          <Link href="/" className="underline-offset-2 hover:underline">
            My Flow
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy break-words lg:text-3xl">
          {task.title}
        </h1>
      </header>

      {readOnly ? (
        <p
          className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted"
          role="status"
        >
          This task belongs to an archived project, so it is read-only here.
          Restore the project from the Projects list to re-enable editing.
        </p>
      ) : null}

      <section className="min-w-0 rounded-md border border-border bg-surface px-4 py-4">
        <h2 className="sr-only">Task record</h2>
        <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
          <DetailItem term="Status">
            {taskStatusLabel(task.status)}
          </DetailItem>
          <DetailItem term="Priority">
            {PRIORITY_LABELS[task.priority]}
          </DetailItem>
          <DetailItem term="Owner">
            <span aria-label={`Owner ${data.ownerInitials}`}>
              {data.ownerInitials}
            </span>
          </DetailItem>
          <DetailItem term="Due">{data.dueLabel}</DetailItem>
          <DetailItem term="Risk route">
            {RISK_ROUTE_LABELS[task.riskRoute]}
          </DetailItem>
          <DetailItem term="Project">
            {data.projectId && data.projectName ? (
              <Link
                href={`/projects/${data.projectId}`}
                className="font-medium text-teal underline-offset-2 hover:underline break-words"
              >
                {data.projectName}
                {data.projectArchived ? " (Archived)" : null}
              </Link>
            ) : (
              "Unassigned"
            )}
          </DetailItem>
          {data.blocked && task.blockedReason ? (
            <DetailItem term="Blocked reason">
              <span className="text-amber break-words">{task.blockedReason}</span>
            </DetailItem>
          ) : null}
          <DetailItem term="Created">
            <time dateTime={task.createdAt}>
              {formatTimestamp(task.createdAt)}
            </time>
          </DetailItem>
          <DetailItem term="Updated">
            <time dateTime={task.updatedAt}>
              {formatTimestamp(task.updatedAt)}
            </time>
          </DetailItem>
        </dl>
      </section>

      {!readOnly ? (
        <section className="min-w-0" aria-label="Task actions">
          <TaskEditor taskId={task.id} onAnnounce={setAnnouncement} />
        </section>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function DetailItem({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        {term}
      </dt>
      <dd className="mt-1 text-navy break-words">{children}</dd>
    </div>
  );
}

function TaskNotFound(): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Task not found
      </h1>
      <p className="text-sm text-muted" role="status">
        This task is not in your workspace. It may have been removed, or the
        link may be incorrect.
      </p>
      <p>
        <Link
          href="/"
          className="text-sm font-medium text-teal underline-offset-2 hover:underline"
        >
          Back to My Flow
        </Link>
      </p>
    </div>
  );
}
