import type { TaskStatus } from "@/lib/domain/task";

const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: "Inbox",
  ready: "Ready",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export function taskStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status];
}

type TaskStatusActionsProps = {
  transitions: readonly TaskStatus[];
  disabledTransitions?: ReadonlySet<TaskStatus>;
  taskTitle: string;
  disabled?: boolean;
  onSelect: (next: TaskStatus) => void;
};

export function TaskStatusActions({
  transitions,
  disabledTransitions,
  taskTitle,
  disabled = false,
  onSelect,
}: TaskStatusActionsProps) {
  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <p className="sr-only">Move {taskTitle} to</p>
      {transitions.map((status) => {
        const isDisabled =
          disabled || (disabledTransitions?.has(status) ?? false);
        return (
          <button
            key={status}
            type="button"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            aria-label={`Move ${taskTitle} to ${STATUS_LABELS[status]}`}
            onClick={() => onSelect(status)}
          >
            {STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
