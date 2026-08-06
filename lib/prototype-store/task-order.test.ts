// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/domain/task";
import { compareTasks, sortTasksBy } from "./task-order";
import { PROJECT_ID_DMC_FLOW_PILOT } from "./seed";
import { PROTOTYPE_OWNER_ID } from "./types";

function makeTask(
  partial: Partial<Task> & Pick<Task, "id" | "title" | "status">,
): Task {
  return {
    projectId: PROJECT_ID_DMC_FLOW_PILOT,
    priority: "medium",
    ownerId: PROTOTYPE_OWNER_ID,
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...partial,
  };
}

describe("sortTasksBy", () => {
  it("matches previous my-flow ordering for default mode", () => {
    const tasks = [
      makeTask({
        id: "b",
        title: "Beta",
        status: "ready",
        priority: "medium",
        dueDate: "2026-08-10",
      }),
      makeTask({
        id: "a",
        title: "Alpha",
        status: "ready",
        priority: "high",
        dueDate: "2026-08-12",
      }),
      makeTask({
        id: "c",
        title: "Charlie",
        status: "ready",
        priority: "medium",
        dueDate: null,
      }),
      makeTask({
        id: "d",
        title: "Delta",
        status: "ready",
        priority: "medium",
        dueDate: "2026-08-08",
      }),
    ];
    const viaSort = sortTasksBy(tasks, "default").map((task) => task.id);
    const viaCompare = [...tasks]
      .map((task) => ({ ...task }))
      .sort(compareTasks)
      .map((task) => task.id);
    expect(viaSort).toEqual(viaCompare);
    expect(viaSort).toEqual(["a", "d", "b", "c"]);
  });

  it("orders by TASK_STATUSES then compareTasks for status mode", () => {
    const tasks = [
      makeTask({
        id: "done-z",
        title: "Z done",
        status: "done",
        priority: "high",
      }),
      makeTask({
        id: "ready-b",
        title: "B ready",
        status: "ready",
        priority: "low",
      }),
      makeTask({
        id: "inbox-a",
        title: "A inbox",
        status: "inbox",
        priority: "medium",
      }),
      makeTask({
        id: "ready-a",
        title: "A ready",
        status: "ready",
        priority: "high",
      }),
      makeTask({
        id: "review",
        title: "Review",
        status: "review",
      }),
      makeTask({
        id: "ip",
        title: "In progress",
        status: "in_progress",
      }),
    ];

    expect(sortTasksBy(tasks, "status").map((task) => task.id)).toEqual([
      "inbox-a",
      "ready-a",
      "ready-b",
      "ip",
      "review",
      "done-z",
    ]);
  });

  it("places missing or invalid due dates last for due mode", () => {
    const tasks = [
      makeTask({
        id: "none",
        title: "None",
        status: "ready",
        dueDate: null,
      }),
      makeTask({
        id: "invalid",
        title: "Invalid",
        status: "ready",
        dueDate: "not-a-date",
      }),
      makeTask({
        id: "late",
        title: "Late",
        status: "ready",
        dueDate: "2026-08-20",
      }),
      makeTask({
        id: "early",
        title: "Early",
        status: "ready",
        dueDate: "2026-08-05",
      }),
    ];

    expect(sortTasksBy(tasks, "due").map((task) => task.id)).toEqual([
      "early",
      "late",
      "invalid",
      "none",
    ]);
  });

  it("does not mutate the input array", () => {
    const tasks = [
      makeTask({ id: "b", title: "B", status: "ready", priority: "low" }),
      makeTask({ id: "a", title: "A", status: "ready", priority: "high" }),
    ];
    const snapshot = tasks.map((task) => ({ ...task }));
    sortTasksBy(tasks, "title");
    expect(tasks).toEqual(snapshot);
  });
});
