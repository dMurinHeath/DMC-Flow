"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import { TaskEditor } from "@/components/task/task-editor";
import { taskStatusLabel } from "@/components/task/task-status-actions";
import { TASK_STATUSES, type TaskPriority } from "@/lib/domain/task";
import { buildProjectDetail } from "@/lib/prototype-store/project-detail";
import {
  TASK_SORT_MODES,
  type TaskSortMode,
} from "@/lib/prototype-store/task-order";
import {
  ProjectArchivedNotice,
  ProjectHeader,
  ProjectNotFound,
} from "./project-header";
import { ProjectViewTabs } from "./project-view-tabs";

const SORT_LABELS: Record<TaskSortMode, string> = {
  default: "Default",
  status: "Status",
  priority: "Priority",
  due: "Due",
  title: "Title",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function defaultGetToday(): string {
  return new Date().toISOString().slice(0, 10);
}

type ProjectDetailViewProps = {
  projectId: string;
  getToday?: () => string;
};

export function ProjectDetailView({
  projectId,
  getToday = defaultGetToday,
}: ProjectDetailViewProps) {
  const { state, hydrated } = usePrototypeStore();
  const [sort, setSort] = useState<TaskSortMode>("default");
  const [announcement, setAnnouncement] = useState("");
  const sortId = useId();
  const listLabelId = useId();

  if (!hydrated) {
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

  const result = buildProjectDetail(state, {
    projectId,
    today: getToday(),
    sort,
  });

  if (!result.ok) {
    return <ProjectNotFound />;
  }

  const { data } = result;
  const { project, rows, statusCounts, totalCount, openCount } = data;
  const readOnly = project.archived;

  function handleSortChange(next: TaskSortMode) {
    setSort(next);
    setAnnouncement(`Sorted by ${SORT_LABELS[next]}.`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ProjectHeader project={project} />
      <ProjectViewTabs projectId={projectId} active="list" />

      {readOnly ? <ProjectArchivedNotice /> : null}

      <section aria-labelledby={listLabelId} className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id={listLabelId} className="text-lg font-semibold text-navy">
              Tasks
            </h2>
            <p className="mt-1 text-sm text-muted">
              {totalCount === 1 ? "1 task" : `${totalCount} tasks`}
              {` · ${openCount} open`}
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {TASK_STATUSES.map((status) => (
                <div key={status} className="flex gap-1">
                  <dt>{taskStatusLabel(status)}</dt>
                  <dd>{statusCounts[status]}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="min-w-0">
            <label htmlFor={sortId} className="block text-sm font-medium text-navy">
              Sort by
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) =>
                handleSortChange(event.target.value as TaskSortMode)
              }
              className="mt-1 min-w-[10rem] rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {TASK_SORT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {SORT_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-md border border-border bg-surface px-4 py-6">
            <p className="text-sm text-navy">No tasks in this project yet.</p>
            <p className="mt-2 text-sm text-muted">
              Assign tasks to this project from Inbox triage or My Flow editing
              to see them here.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
            <div className="min-w-0 overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Tasks in {project.name}, sorted by {SORT_LABELS[sort]}
              </caption>
              <thead>
                <tr className="border-b border-border text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Title
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Priority
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Due
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Owner
                  </th>
                  {!readOnly ? (
                    <th scope="col" className="px-3 py-3 font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy break-words">
                        <Link
                          href={`/task?id=${encodeURIComponent(row.id)}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {row.title}
                        </Link>
                      </p>
                      {row.blocked ? (
                        <p className="mt-1 text-xs text-amber">Blocked</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted whitespace-nowrap">
                      {taskStatusLabel(row.status)}
                    </td>
                    <td className="px-3 py-3 text-muted whitespace-nowrap">
                      {PRIORITY_LABELS[row.priority]}
                    </td>
                    <td className="px-3 py-3 text-muted whitespace-nowrap">
                      {row.due}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        role="img"
                        aria-label={`Owner ${row.ownerInitials}`}
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-on-navy"
                      >
                        {row.ownerInitials}
                      </span>
                    </td>
                    {!readOnly ? (
                      <td className="px-3 py-3">
                        <TaskEditor
                          taskId={row.id}
                          onAnnounce={setAnnouncement}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
