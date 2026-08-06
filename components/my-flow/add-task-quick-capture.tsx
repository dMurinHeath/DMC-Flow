"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { parseTaskDraft, TASK_TITLE_MAX_LENGTH } from "@/lib/domain/task";
import { createInboxTask } from "@/lib/prototype-store/create-inbox-task";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";

const FORM_ID = "add-task-quick-capture";
const ERROR_ID = "add-task-quick-capture-error";

export type CreateTaskIds = () => { id: string; now: string };

function defaultCreateTaskIds(): { id: string; now: string } {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    now: new Date().toISOString(),
  };
}

type AddTaskQuickCaptureProps = {
  createTaskIds?: CreateTaskIds;
};

export function AddTaskQuickCapture({
  createTaskIds = defaultCreateTaskIds,
}: AddTaskQuickCaptureProps) {
  const { hydrated, dispatch } = usePrototypeStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  function clearFormState() {
    setTitle("");
    setError(null);
  }

  function closeForm(options?: { clearConfirmation?: boolean }) {
    setOpen(false);
    clearFormState();
    if (options?.clearConfirmation) {
      setConfirmation("");
    }
  }

  function cancel() {
    closeForm({ clearConfirmation: true });
    triggerRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated) {
      return;
    }

    const parsed = parseTaskDraft({ title });
    if (!parsed.ok) {
      setError(parsed.issues[0]?.message ?? "Title is required.");
      inputRef.current?.focus();
      return;
    }

    const { id, now } = createTaskIds();
    const task = createInboxTask({
      title: parsed.value.title,
      id,
      now,
    });
    dispatch({ type: "save_task", task });
    closeForm();
    setConfirmation("Task added to Inbox.");
    triggerRef.current?.focus();
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:w-auto sm:items-end">
      <button
        ref={triggerRef}
        type="button"
        disabled={!hydrated}
        aria-expanded={open}
        aria-controls={FORM_ID}
        onClick={() => {
          if (!hydrated) {
            return;
          }
          setConfirmation("");
          setOpen((current) => !current);
          if (open) {
            clearFormState();
          }
        }}
        className={
          hydrated
            ? "h-10 shrink-0 rounded-md bg-teal px-4 text-sm font-medium text-on-navy"
            : "h-10 shrink-0 cursor-not-allowed rounded-md border border-border bg-canvas px-4 text-sm font-medium text-muted"
        }
      >
        Add task
      </button>

      {open ? (
        <form
          id={FORM_ID}
          noValidate
          aria-label="Add task"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className="w-full min-w-0 rounded-md border border-border bg-surface p-3 sm:w-80"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor={labelId}
              className="text-sm font-medium text-navy"
            >
              Task title
            </label>
            <input
              ref={inputRef}
              id={labelId}
              name="title"
              type="text"
              value={title}
              maxLength={TASK_TITLE_MAX_LENGTH + 50}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              className="h-10 w-full rounded-md border border-border bg-canvas px-3 text-sm text-navy"
            />
            {error ? (
              <p id={ERROR_ID} role="alert" className="text-sm text-amber">
                {error}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="h-9 rounded-md bg-teal px-3 text-sm font-medium text-on-navy"
            >
              Add task
            </button>
            <button
              type="button"
              onClick={cancel}
              className="h-9 rounded-md border border-border bg-canvas px-3 text-sm font-medium text-navy"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {confirmation}
      </p>
    </div>
  );
}
