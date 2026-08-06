"use client";

import { useState, type DragEvent } from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import { taskStatusLabel } from "@/components/task/task-status-actions";
import {
  canTransitionTaskStatus,
  type TaskStatus,
} from "@/lib/domain/task";
import {
  buildProjectBoard,
  resolveBoardDrop,
} from "@/lib/prototype-store/project-board";
import {
  BOARD_DRAG_MIME,
  ProjectBoardCard,
} from "./project-board-card";
import {
  ProjectArchivedNotice,
  ProjectHeader,
  ProjectNotFound,
} from "./project-header";
import { ProjectViewTabs } from "./project-view-tabs";

function defaultGetToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultGetNow(): Date {
  return new Date();
}

type ProjectBoardViewProps = {
  projectId: string;
  getToday?: () => string;
  getNow?: () => Date;
};

export function ProjectBoardView({
  projectId,
  getToday = defaultGetToday,
  getNow = defaultGetNow,
}: ProjectBoardViewProps) {
  const { state, hydrated, dispatch } = usePrototypeStore();
  const [announcement, setAnnouncement] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [draggingFromStatus, setDraggingFromStatus] = useState<TaskStatus | null>(
    null,
  );
  const [hoverStatus, setHoverStatus] = useState<TaskStatus | null>(null);
  const [dropHandled, setDropHandled] = useState(false);

  if (!hydrated) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div
          className="rounded-md border border-border bg-surface px-4 py-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-muted">Loading project board…</p>
        </div>
      </div>
    );
  }

  const result = buildProjectBoard(state, {
    projectId,
    today: getToday(),
  });

  if (!result.ok) {
    return <ProjectNotFound />;
  }

  const { data } = result;
  const { project, columns, totalCount } = data;
  const readOnly = project.archived;

  function announce(message: string) {
    setAnnouncement(message);
  }

  function applyMove(taskId: string, targetStatus: TaskStatus, fromStatus: TaskStatus | null) {
    const current = state.tasks.find((task) => task.id === taskId);
    if (!current) {
      announce("That task is no longer available.");
      return;
    }
    if (current.projectId !== projectId) {
      announce("That task no longer belongs to this project.");
      return;
    }
    if (fromStatus !== null && current.status !== fromStatus) {
      announce("That task has already changed status. Refresh and try again.");
      return;
    }

    const drop = resolveBoardDrop({
      tasks: state.tasks,
      taskId,
      projectId,
      targetStatus,
      now: getNow(),
    });

    if (!drop.ok) {
      announce(drop.message);
      return;
    }

    dispatch({ type: "save_task", task: drop.task });
    announce(
      `Moved “${drop.task.title}” to ${taskStatusLabel(targetStatus)}.`,
    );
  }

  function handleStatusSelect(taskId: string, next: TaskStatus) {
    const current = state.tasks.find((task) => task.id === taskId);
    applyMove(taskId, next, current?.status ?? null);
  }

  function handleColumnDragOver(
    event: DragEvent<HTMLElement>,
    targetStatus: TaskStatus,
  ) {
    if (readOnly || !draggingTaskId) {
      return;
    }
    const task = state.tasks.find((candidate) => candidate.id === draggingTaskId);
    if (!task || task.projectId !== projectId) {
      return;
    }
    if (!canTransitionTaskStatus(task.status, targetStatus)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleColumnDrop(
    event: DragEvent<HTMLElement>,
    targetStatus: TaskStatus,
  ) {
    event.preventDefault();
    if (readOnly) {
      return;
    }
    const taskId =
      event.dataTransfer.getData(BOARD_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain") ||
      draggingTaskId;
    if (!taskId) {
      announce("Could not identify the dragged task.");
      return;
    }
    setDropHandled(true);
    applyMove(taskId, targetStatus, draggingFromStatus);
    setDraggingTaskId(null);
    setDraggingFromStatus(null);
    setHoverStatus(null);
  }

  function handleCardDragStart(taskId: string, status: TaskStatus) {
    setDropHandled(false);
    setDraggingTaskId(taskId);
    setDraggingFromStatus(status);
  }

  function handleDragEnd() {
    if (
      !dropHandled &&
      !readOnly &&
      draggingTaskId &&
      hoverStatus &&
      draggingFromStatus
    ) {
      const drop = resolveBoardDrop({
        tasks: state.tasks,
        taskId: draggingTaskId,
        projectId,
        targetStatus: hoverStatus,
        now: getNow(),
      });
      if (!drop.ok) {
        announce(drop.message);
      }
    }
    setDraggingTaskId(null);
    setDraggingFromStatus(null);
    setHoverStatus(null);
    setDropHandled(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6" onDragEnd={handleDragEnd}>
      <ProjectHeader project={project} />
      <ProjectViewTabs projectId={projectId} active="board" />

      {readOnly ? <ProjectArchivedNotice /> : null}

      <p className="text-sm text-muted">
        {totalCount === 1 ? "1 task" : `${totalCount} tasks`} on this board
      </p>

      <div className="relative min-h-[28rem] min-w-0 w-full">
        <div className="absolute inset-0 overflow-x-auto pb-2">
          <div className="flex w-max gap-3">
            {columns.map((column) => {
            const labelId = `board-column-${column.status}`;
            const acceptsDrag =
              !readOnly &&
              draggingTaskId !== null &&
              (() => {
                const task = state.tasks.find((t) => t.id === draggingTaskId);
                return (
                  !!task &&
                  task.projectId === projectId &&
                  canTransitionTaskStatus(task.status, column.status)
                );
              })();

            return (
              <section
                key={column.status}
                aria-labelledby={labelId}
                className={
                  acceptsDrag
                    ? "flex w-64 shrink-0 flex-col gap-2 rounded-md border border-teal bg-surface px-3 py-3"
                    : "flex w-64 shrink-0 flex-col gap-2 rounded-md border border-border bg-surface px-3 py-3"
                }
                onDragEnter={() => {
                  if (!readOnly) {
                    setHoverStatus(column.status);
                  }
                }}
                onDragOver={(event) =>
                  handleColumnDragOver(event, column.status)
                }
                onDrop={(event) => handleColumnDrop(event, column.status)}
              >
                <h2
                  id={labelId}
                  className="text-xs font-semibold tracking-[0.14em] text-muted uppercase"
                >
                  {taskStatusLabel(column.status)}{" "}
                  <span className="normal-case tracking-normal text-navy">
                    ({column.count})
                  </span>
                </h2>
                {column.rows.length === 0 ? (
                  <p className="py-4 text-sm text-muted">No tasks</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {column.rows.map((row) => (
                      <li
                        key={row.id}
                        onDragStart={() =>
                          handleCardDragStart(row.id, row.status)
                        }
                      >
                        <ProjectBoardCard
                          row={row}
                          readOnly={readOnly}
                          onStatusSelect={handleStatusSelect}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
