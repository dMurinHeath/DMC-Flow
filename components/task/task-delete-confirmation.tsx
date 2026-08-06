import { useEffect, useRef } from "react";

type TaskDeleteConfirmationProps = {
  taskTitle: string;
  titleId?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TaskDeleteConfirmation({
  taskTitle,
  titleId,
  onConfirm,
  onCancel,
}: TaskDeleteConfirmationProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-3">
      <p className="text-sm text-navy">
        Delete &ldquo;{taskTitle}&rdquo;? This cannot be undone in this
        prototype.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          ref={confirmRef}
          type="button"
          className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-on-navy"
          aria-describedby={titleId}
          onClick={onConfirm}
        >
          Confirm delete
        </button>
        <button
          type="button"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
