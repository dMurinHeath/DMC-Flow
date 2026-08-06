"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import type { Task } from "@/lib/domain/task";
import {
  moveInboxTaskToReady,
  selectActiveProjects,
  selectInboxTasks,
} from "@/lib/prototype-store/inbox";

export type GetNow = () => string;

function defaultGetNow(): string {
  return new Date().toISOString();
}

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
  getNow?: GetNow;
};

export function InboxView({ getNow = defaultGetNow }: InboxViewProps) {
  const { state, hydrated, dispatch } = usePrototypeStore();
  const [projectByTaskId, setProjectByTaskId] = useState<Record<string, string>>(
    {},
  );
  const [errorsByTaskId, setErrorsByTaskId] = useState<Record<string, string>>(
    {},
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const deleteButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const confirmDeleteRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const inboxTasks = hydrated ? selectInboxTasks(state.tasks) : [];
  const activeProjects = hydrated ? selectActiveProjects(state.projects) : [];

  useEffect(() => {
    if (pendingDeleteId) {
      confirmDeleteRef.current?.focus();
    }
  }, [pendingDeleteId]);

  function setTaskError(taskId: string, message: string | null) {
    setErrorsByTaskId((current) => {
      if (message === null) {
        if (!(taskId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[taskId];
        return next;
      }
      return { ...current, [taskId]: message };
    });
  }

  function handleMove(task: Task) {
    if (!hydrated) {
      return;
    }

    const projectId = projectByTaskId[task.id] ?? "";
    if (!projectId) {
      setTaskError(task.id, "Choose a project before moving to Ready.");
      return;
    }

    const currentTask = state.tasks.find((candidate) => candidate.id === task.id);
    if (!currentTask || currentTask.status !== "inbox") {
      setTaskError(
        task.id,
        "This task is no longer in Inbox. Refresh and try again.",
      );
      return;
    }

    const result = moveInboxTaskToReady({
      task: currentTask,
      projectId,
      projects: state.projects,
      now: getNow(),
    });

    if (!result.ok) {
      setTaskError(task.id, result.message);
      return;
    }

    dispatch({ type: "save_task", task: result.task });
    setTaskError(task.id, null);
    setPendingDeleteId((current) => (current === task.id ? null : current));
    setProjectByTaskId((current) => {
      if (!(task.id in current)) {
        return current;
      }
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    setAnnouncement("Task moved to Ready.");
  }

  function handleDeleteRequest(taskId: string) {
    if (!hydrated) {
      return;
    }
    setPendingDeleteId(taskId);
    setTaskError(taskId, null);
  }

  function handleDeleteCancel(taskId: string) {
    setPendingDeleteId(null);
    const button = deleteButtonRefs.current.get(taskId);
    button?.focus();
  }

  function handleDeleteConfirm(task: Task) {
    if (!hydrated) {
      return;
    }
    dispatch({ type: "remove_task", taskId: task.id });
    setPendingDeleteId(null);
    setAnnouncement("Task deleted.");
    queueMicrotask(() => {
      listRef.current?.focus();
    });
  }

  function handleProjectChange(taskId: string, projectId: string) {
    setProjectByTaskId((current) => ({ ...current, [taskId]: projectId }));
    setTaskError(taskId, null);
  }

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
          {inboxTasks.map((task) => {
            const titleId = `inbox-task-title-${task.id}`;
            const projectSelectId = `inbox-project-${task.id}`;
            const errorId = `inbox-error-${task.id}`;
            const error = errorsByTaskId[task.id];
            const isConfirming = pendingDeleteId === task.id;
            const selectedProject = projectByTaskId[task.id] ?? "";

            return (
              <li
                key={task.id}
                className="min-w-0 rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="min-w-0">
                    <h2
                      id={titleId}
                      className="text-sm font-medium text-navy break-words"
                    >
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

                  {isConfirming ? (
                    <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-3">
                      <p className="text-sm text-navy">
                        Delete &ldquo;{task.title}&rdquo;? This cannot be undone
                        in this prototype.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          ref={confirmDeleteRef}
                          type="button"
                          className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-on-navy"
                          aria-describedby={titleId}
                          onClick={() => handleDeleteConfirm(task)}
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
                          onClick={() => handleDeleteCancel(task.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="flex min-w-0 flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-end"
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        handleMove(task);
                      }}
                    >
                      <div className="min-w-0 flex-1 sm:max-w-xs">
                        <label
                          htmlFor={projectSelectId}
                          className="block text-xs font-medium tracking-wide text-muted uppercase"
                        >
                          Project
                          <span className="sr-only"> for {task.title}</span>
                        </label>
                        <select
                          id={projectSelectId}
                          className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy disabled:cursor-not-allowed disabled:opacity-60"
                          value={selectedProject}
                          disabled={!hydrated}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? errorId : undefined}
                          onChange={(event) =>
                            handleProjectChange(task.id, event.target.value)
                          }
                        >
                          <option value="">Select a project</option>
                          {activeProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-on-navy disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!hydrated || !selectedProject}
                          aria-describedby={titleId}
                        >
                          Move to Ready
                        </button>
                        <button
                          ref={(element) => {
                            if (element) {
                              deleteButtonRefs.current.set(task.id, element);
                            } else {
                              deleteButtonRefs.current.delete(task.id);
                            }
                          }}
                          type="button"
                          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!hydrated}
                          aria-describedby={titleId}
                          onClick={() => handleDeleteRequest(task.id)}
                        >
                          Delete
                        </button>
                      </div>

                      {error ? (
                        <p
                          id={errorId}
                          className="basis-full text-sm text-amber"
                          role="alert"
                        >
                          {error}
                        </p>
                      ) : null}
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
