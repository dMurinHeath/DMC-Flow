import type { ReactNode } from "react";
import { TaskEditor } from "@/components/task/task-editor";
import { AddTaskQuickCapture } from "./add-task-quick-capture";
import type {
  MyFlowDashboardData,
  MyFlowTaskRow,
  SummaryEmphasis,
} from "./my-flow-fixtures";

type MyFlowDashboardProps = {
  data: MyFlowDashboardData;
  onAnnounce?: (message: string) => void;
};

const TASK_COLUMNS =
  "grid-cols-[1fr_minmax(0,9rem)_minmax(0,6rem)_minmax(0,4.5rem)_minmax(0,5rem)]";

function emphasisTextClass(emphasis: SummaryEmphasis): string {
  return emphasis === "amber" ? "text-amber" : "text-teal";
}

function OwnerMark({ initials }: { initials: string }) {
  return (
    <span
      role="img"
      aria-label={`Owner ${initials}`}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-on-navy"
    >
      {initials}
    </span>
  );
}

function TaskRow({
  task,
  onAnnounce,
}: {
  task: MyFlowTaskRow;
  onAnnounce?: (message: string) => void;
}) {
  return (
    <li className="border-t border-border py-3 first:border-t-0">
      <div className="flex gap-3">
        <span
          className="mt-1 size-4 shrink-0 rounded-full border border-border lg:mt-0.5"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="lg:grid lg:grid-cols-[1fr_minmax(0,9rem)_minmax(0,6rem)_minmax(0,4.5rem)_minmax(0,5rem)] lg:items-start lg:gap-3">
            <p className="text-sm font-medium text-navy lg:truncate">{task.title}</p>
            <dl className="mt-2 grid gap-2 text-sm text-muted sm:grid-cols-3 lg:mt-0 lg:contents">
              <div className="min-w-0 lg:min-w-0">
                <dt className="sr-only">Project</dt>
                <dd className="truncate">{task.project}</dd>
              </div>
              <div className="min-w-0">
                <dt className="sr-only">Due</dt>
                <dd className="truncate">{task.due}</dd>
              </div>
              <div className="min-w-0">
                <dt className="sr-only">Owner</dt>
                <dd>
                  <OwnerMark initials={task.ownerInitials} />
                </dd>
              </div>
            </dl>
            <div className="mt-3 min-w-0 lg:mt-0">
              <TaskEditor taskId={task.id} onAnnounce={onAnnounce} />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function TaskSection({
  title,
  tasks,
  emptyMessage,
  trailing,
  onAnnounce,
}: {
  title: string;
  tasks: MyFlowTaskRow[];
  emptyMessage: string;
  trailing?: ReactNode;
  onAnnounce?: (message: string) => void;
}) {
  return (
    <section className="rounded-md border border-border bg-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          {title}
        </h2>
        {trailing}
      </div>
      {tasks.length === 0 ? (
        <p className="py-2 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <>
          <div
            className={`mb-1 hidden gap-3 pl-7 text-xs font-medium tracking-wide text-muted uppercase lg:grid ${TASK_COLUMNS}`}
            aria-hidden
          >
            <span>Task</span>
            <span>Project</span>
            <span>Due</span>
            <span>Owner</span>
            <span>Actions</span>
          </div>
          <ul>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onAnnounce={onAnnounce} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function MyFlowDashboard({ data, onAnnounce }: MyFlowDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">
            {data.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy lg:text-3xl">
            {data.heading}
          </h1>
          <p className="mt-2 text-sm text-muted lg:text-base">
            {data.supportingText}
          </p>
        </div>
        <AddTaskQuickCapture />
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
        {data.summary.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 bg-surface px-4 py-3"
          >
            <dt className="text-sm text-muted">{item.label}</dt>
            <dd
              className={`text-2xl font-semibold tracking-tight ${emphasisTextClass(item.emphasis)}`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <TaskSection
            title="Now"
            tasks={data.nowTasks}
            emptyMessage="No tasks in progress."
            onAnnounce={onAnnounce}
          />
          <TaskSection
            title="Next"
            tasks={data.nextTasks}
            emptyMessage="No Ready tasks yet."
            onAnnounce={onAnnounce}
            trailing={
              <span className="text-sm font-medium text-teal">
                {data.nextTotalLabel}
                <span className="sr-only"> (unavailable)</span>
              </span>
            }
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-md border border-border bg-surface px-4 py-3">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              Review queue
            </h2>
            {data.reviewQueue.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No tasks awaiting review.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.reviewQueue.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 py-3 text-sm text-navy first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{item.title}</span>
                      <span className="text-muted" aria-hidden>
                        ›
                      </span>
                    </div>
                    <TaskEditor taskId={item.id} onAnnounce={onAnnounce} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-border bg-surface px-4 py-3">
            <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              Project health
            </h2>
            {data.projectHealth.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No active projects.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.projectHealth.map((project) => (
                  <li key={project.id} className="text-sm">
                    <p className="font-medium text-navy">{project.name}</p>
                    <p
                      className={`mt-1 flex items-center gap-2 ${emphasisTextClass(project.emphasis)}`}
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          project.emphasis === "amber" ? "bg-amber" : "bg-teal"
                        }`}
                        aria-hidden
                      />
                      <span>{project.status}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
