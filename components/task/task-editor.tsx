"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import {
  TASK_PRIORITIES,
  TASK_TITLE_MAX_LENGTH,
  allowedTransitions,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain/task";
import {
  TASK_BLOCKED_REASON_MAX_LENGTH,
  applyStatusChange,
  applyTaskEdit,
  validateTaskEdit,
  type TaskEditDraft,
  type TaskEditIssue,
} from "@/lib/domain/task-edit";
import { selectActiveProjects } from "@/lib/prototype-store/projects";
import { PROTOTYPE_OWNER_ID } from "@/lib/prototype-store/types";
import { TaskDeleteConfirmation } from "./task-delete-confirmation";
import { TaskStatusActions } from "./task-status-actions";

export type GetNowDate = () => Date;

function defaultGetNow(): Date {
  return new Date();
}

function draftFromTask(task: Task): TaskEditDraft {
  return {
    title: task.title,
    projectId: task.projectId,
    priority: task.priority,
    ownerId: task.ownerId,
    dueDate: task.dueDate,
    blockedReason: task.blockedReason,
  };
}

function issueMessage(issue: TaskEditIssue): string {
  switch (issue.field) {
    case "title":
      return issue.code === "empty"
        ? "Title is required."
        : `Title must be at most ${TASK_TITLE_MAX_LENGTH} characters.`;
    case "dueDate":
      return "Due date must be a valid YYYY-MM-DD date.";
    case "projectId":
      return issue.code === "archived"
        ? "Choose an active project that is not archived."
        : "Choose a known project.";
    case "blockedReason":
      return `Blocked reason must be at most ${TASK_BLOCKED_REASON_MAX_LENGTH} characters.`;
  }
}

type TaskEditorProps = {
  taskId: string;
  getNow?: GetNowDate;
  /** When true, open the editor expanded (useful for Inbox triage). */
  defaultOpen?: boolean;
  onAnnounce?: (message: string) => void;
};

export function TaskEditor({
  taskId,
  getNow = defaultGetNow,
  defaultOpen = false,
  onAnnounce,
}: TaskEditorProps) {
  const { state, hydrated, dispatch } = usePrototypeStore();
  const task = state.tasks.find((candidate) => candidate.id === taskId) ?? null;

  const [open, setOpen] = useState(defaultOpen);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState<TaskEditDraft | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const titleFieldId = useId();
  const projectFieldId = useId();
  const priorityFieldId = useId();
  const ownerFieldId = useId();
  const dueFieldId = useId();
  const blockedFieldId = useId();
  const errorId = useId();
  const titleLabelId = useId();

  const activeProjects = selectActiveProjects(state.projects);

  useEffect(() => {
    if (open && draft && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [open, draft]);

  if (!task) {
    if (!announcement) {
      return null;
    }
    return (
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    );
  }

  const currentDraft = draft ?? draftFromTask(task);
  const renderedStatus = task.status;
  const transitions = allowedTransitions(renderedStatus);
  const readyNeedsProject =
    task.status === "inbox" &&
    (currentDraft.projectId === null ||
      !activeProjects.some((project) => project.id === currentDraft.projectId));
  const disabledTransitions = readyNeedsProject
    ? new Set<TaskStatus>(["ready"])
    : undefined;

  function announce(message: string) {
    setAnnouncement(message);
    onAnnounce?.(message);
  }

  function openEditor() {
    if (!hydrated || !task) {
      return;
    }
    setConfirmingDelete(false);
    setFieldError(null);
    setDraft(draftFromTask(task));
    setOpen(true);
  }

  function closeEditor(options?: { focusTrigger?: boolean }) {
    setOpen(false);
    setDraft(null);
    setFieldError(null);
    setConfirmingDelete(false);
    if (options?.focusTrigger !== false) {
      triggerRef.current?.focus();
    }
  }

  function updateDraft<K extends keyof TaskEditDraft>(
    key: K,
    value: TaskEditDraft[K],
  ) {
    setDraft((current) => {
      const base = current ?? (task ? draftFromTask(task) : null);
      if (!base) {
        return current;
      }
      return { ...base, [key]: value };
    });
    setFieldError(null);
  }

  function resolveCurrentTask(): Task | null {
    return state.tasks.find((candidate) => candidate.id === taskId) ?? null;
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated) {
      return;
    }

    const current = resolveCurrentTask();
    if (!current) {
      setFieldError("This task is no longer available. Refresh and try again.");
      return;
    }

    const nextDraft = draft ?? draftFromTask(current);
    const issues = validateTaskEdit(nextDraft, state.projects);
    if (issues.length > 0) {
      setFieldError(issueMessage(issues[0]!));
      titleInputRef.current?.focus();
      return;
    }

    if (nextDraft.projectId !== null) {
      const project = state.projects.find(
        (candidate) => candidate.id === nextDraft.projectId,
      );
      if (!project || project.archived) {
        setFieldError(
          "Choose an active project that is not archived. Refresh and try again.",
        );
        return;
      }
    }

    const saved = applyTaskEdit(current, nextDraft, getNow());
    dispatch({ type: "save_task", task: saved });
    announce("Task saved.");
    closeEditor();
  }

  function handleStatus(next: TaskStatus) {
    if (!hydrated) {
      return;
    }

    const current = resolveCurrentTask();
    if (!current) {
      setFieldError("This task is no longer available. Refresh and try again.");
      return;
    }

    if (current.status !== renderedStatus) {
      setFieldError(
        "This task status has already changed. Refresh and try again.",
      );
      return;
    }

    if (next === "ready") {
      const projectId = (draft ?? draftFromTask(current)).projectId;
      if (!projectId) {
        setFieldError("Choose a project before moving to Ready.");
        return;
      }
      const project = state.projects.find(
        (candidate) => candidate.id === projectId,
      );
      if (!project || project.archived) {
        setFieldError(
          "Choose an active project that is not archived. Refresh and try again.",
        );
        return;
      }
      if (current.projectId !== projectId) {
        const withProject = applyTaskEdit(
          current,
          { ...draftFromTask(current), ...(draft ?? {}), projectId },
          getNow(),
        );
        const moved = applyStatusChange(withProject, next, getNow());
        if (!moved) {
          setFieldError("That status change is no longer permitted.");
          return;
        }
        dispatch({ type: "save_task", task: moved });
        announce("Task moved to Ready.");
        closeEditor({ focusTrigger: false });
        return;
      }
    }

    const moved = applyStatusChange(current, next, getNow());
    if (!moved) {
      setFieldError("That status change is no longer permitted.");
      return;
    }
    dispatch({ type: "save_task", task: moved });
    announce(`Task moved to ${next.replaceAll("_", " ")}.`);
    closeEditor({ focusTrigger: false });
  }

  function handleDeleteConfirm() {
    if (!hydrated) {
      return;
    }
    const current = resolveCurrentTask();
    if (!current) {
      setFieldError("This task is no longer available. Refresh and try again.");
      setConfirmingDelete(false);
      return;
    }
    dispatch({ type: "remove_task", taskId: current.id });
    setConfirmingDelete(false);
    setOpen(false);
    setDraft(null);
    announce("Task deleted.");
  }

  function handleDeleteCancel() {
    setConfirmingDelete(false);
    deleteTriggerRef.current?.focus();
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2">
        <button
          ref={triggerRef}
          type="button"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-navy disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hydrated}
          aria-expanded={open}
          aria-controls={formId}
          aria-label={open ? `Close editor for ${task.title}` : `Edit ${task.title}`}
          onClick={() => {
            if (open) {
              closeEditor();
            } else {
              openEditor();
            }
          }}
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {confirmingDelete ? (
        <TaskDeleteConfirmation
          taskTitle={task.title}
          titleId={titleLabelId}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      ) : open ? (
        <form
          id={formId}
          className="mt-3 flex min-w-0 flex-col gap-3 border-t border-border pt-3"
          onSubmit={handleSave}
          onKeyDown={handleFormKeyDown}
          noValidate
        >
          <p id={titleLabelId} className="sr-only">
            {task.title}
          </p>

          <div className="min-w-0">
            <label
              htmlFor={titleFieldId}
              className="block text-xs font-medium tracking-wide text-muted uppercase"
            >
              Title
            </label>
            <input
              ref={titleInputRef}
              id={titleFieldId}
              name="title"
              type="text"
              value={currentDraft.title}
              maxLength={TASK_TITLE_MAX_LENGTH + 50}
              className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? errorId : undefined}
              onChange={(event) => updateDraft("title", event.target.value)}
            />
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor={projectFieldId}
                className="block text-xs font-medium tracking-wide text-muted uppercase"
              >
                Project
              </label>
              <select
                id={projectFieldId}
                className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy"
                value={currentDraft.projectId ?? ""}
                onChange={(event) =>
                  updateDraft(
                    "projectId",
                    event.target.value === "" ? null : event.target.value,
                  )
                }
              >
                <option value="">Unassigned</option>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor={priorityFieldId}
                className="block text-xs font-medium tracking-wide text-muted uppercase"
              >
                Priority
              </label>
              <select
                id={priorityFieldId}
                className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy"
                value={currentDraft.priority}
                onChange={(event) =>
                  updateDraft("priority", event.target.value as TaskPriority)
                }
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor={ownerFieldId}
                className="block text-xs font-medium tracking-wide text-muted uppercase"
              >
                Owner
              </label>
              <select
                id={ownerFieldId}
                className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy"
                value={currentDraft.ownerId ?? ""}
                onChange={(event) =>
                  updateDraft(
                    "ownerId",
                    event.target.value === "" ? null : event.target.value,
                  )
                }
              >
                <option value="">Unassigned</option>
                <option value={PROTOTYPE_OWNER_ID}>DM</option>
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor={dueFieldId}
                className="block text-xs font-medium tracking-wide text-muted uppercase"
              >
                Due date
              </label>
              <input
                id={dueFieldId}
                type="date"
                className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy"
                value={currentDraft.dueDate ?? ""}
                onChange={(event) =>
                  updateDraft(
                    "dueDate",
                    event.target.value === "" ? null : event.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className="min-w-0">
            <label
              htmlFor={blockedFieldId}
              className="block text-xs font-medium tracking-wide text-muted uppercase"
            >
              Blocked reason
            </label>
            <input
              id={blockedFieldId}
              type="text"
              className="mt-1 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-navy"
              value={currentDraft.blockedReason ?? ""}
              maxLength={TASK_BLOCKED_REASON_MAX_LENGTH + 50}
              placeholder="Leave blank if not blocked"
              onChange={(event) =>
                updateDraft(
                  "blockedReason",
                  event.target.value === "" ? null : event.target.value,
                )
              }
            />
          </div>

          {fieldError ? (
            <p id={errorId} className="text-sm text-amber" role="alert">
              {fieldError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-on-navy disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hydrated}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
              onClick={() => closeEditor()}
            >
              Cancel
            </button>
            <button
              ref={deleteTriggerRef}
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          </div>

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
              Move to
            </p>
            <TaskStatusActions
              transitions={transitions}
              disabledTransitions={disabledTransitions}
              taskTitle={task.title}
              disabled={!hydrated}
              onSelect={handleStatus}
            />
          </div>
        </form>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
