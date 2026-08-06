"use client";

import { useId, useRef, useState } from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import { TaskEditor } from "@/components/task/task-editor";
import type { Task } from "@/lib/domain/task";
import { selectInboxTasks } from "@/lib/prototype-store/inbox";

function formatCreatedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPriority(priority: Task["priority"]): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

type InboxViewProps = {
  getNow?: () => Date;
};

export function InboxView({ getNow }: InboxViewProps) {
  const { state, hydrated } = usePrototypeStore();
  const listRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [announcement, setAnnouncement] = useState("");

  const inboxTasks = hydrated ? selectInboxTasks(state.tasks) : [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        ref={listRef}
        tabIndex={-1}
        className="outline-none"
        aria-labelledby={headingId}
      >
        <p id={headingId} className="text-sm text-muted">
          {!hydrated
            ? "Loading Inbox…"
            : inboxTasks.length === 1
              ? "1 task in Inbox"
              : `${inboxTasks.length} tasks in Inbox`}
        </p>
      </div>

      {!hydrated ? (
        <div
          className="rounded-md border border-border bg-surface px-4 py-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-muted">Loading your Inbox tasks…</p>
        </div>
      ) : inboxTasks.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-4 py-6">
          <p className="text-sm text-navy">Inbox is empty.</p>
          <p className="mt-2 text-sm text-muted">
            Tasks created with Add task on My Flow will appear here for triage.
          </p>
        </div>
      ) : (
        <ul className="flex min-w-0 flex-col gap-3">
          {inboxTasks.map((task) => (
            <li
              key={task.id}
              className="min-w-0 rounded-md border border-border bg-surface px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-navy break-words">
                    {task.title}
                  </h2>
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <div className="flex gap-1">
                      <dt className="sr-only">Priority</dt>
                      <dd>{formatPriority(task.priority)}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Created</dt>
                      <dd>
                        <time dateTime={task.createdAt}>
                          {formatCreatedDate(task.createdAt)}
                        </time>
                      </dd>
                    </div>
                  </dl>
                </div>
                <TaskEditor
                  taskId={task.id}
                  defaultOpen
                  getNow={getNow}
                  onAnnounce={setAnnouncement}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
