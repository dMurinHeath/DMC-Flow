"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import {
  TaskStatusActions,
  taskStatusLabel,
} from "@/components/task/task-status-actions";
import {
  allowedTransitions,
  type TaskStatus,
} from "@/lib/domain/task";
import type { ProjectTaskRow } from "@/lib/prototype-store/project-detail";

const BOARD_DRAG_MIME = "application/x-dmc-flow-task-id";

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

type ProjectBoardCardProps = {
  row: ProjectTaskRow;
  readOnly: boolean;
  onStatusSelect: (taskId: string, next: TaskStatus) => void;
};

export function ProjectBoardCard({
  row,
  readOnly,
  onStatusSelect,
}: ProjectBoardCardProps) {
  const transitions = allowedTransitions(row.status);

  function handleDragStart(event: DragEvent<HTMLElement>) {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(BOARD_DRAG_MIME, row.id);
    event.dataTransfer.setData("text/plain", row.id);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <article
      className={
        readOnly
          ? "rounded-md border border-border bg-canvas px-3 py-2"
          : "cursor-grab rounded-md border border-border bg-canvas px-3 py-2 active:cursor-grabbing"
      }
      {...(readOnly
        ? {}
        : {
            draggable: true as const,
            onDragStart: handleDragStart,
          })}
      aria-label={`${row.title}, ${taskStatusLabel(row.status)}`}
    >
      <p className="text-sm font-medium text-navy break-words">
        <Link
          href={`/task?id=${encodeURIComponent(row.id)}`}
          draggable={false}
          className="underline-offset-2 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.title}
        </Link>
      </p>
      <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <div className="flex gap-1">
          <dt className="sr-only">Priority</dt>
          <dd>{PRIORITY_LABELS[row.priority]}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Due</dt>
          <dd>{row.due}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Owner</dt>
          <dd aria-label={`Owner ${row.ownerInitials}`}>{row.ownerInitials}</dd>
        </div>
      </dl>
      {row.blocked ? (
        <p className="mt-2 text-xs text-amber">Blocked</p>
      ) : null}
      {!readOnly && transitions.length > 0 ? (
        <div className="mt-2">
          <TaskStatusActions
            transitions={transitions}
            taskTitle={row.title}
            onSelect={(next) => onStatusSelect(row.id, next)}
          />
        </div>
      ) : null}
    </article>
  );
}

export { BOARD_DRAG_MIME };
