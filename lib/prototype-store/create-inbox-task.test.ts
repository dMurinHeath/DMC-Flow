// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createInboxTask } from "./create-inbox-task";
import { PROTOTYPE_OWNER_ID } from "./types";

describe("createInboxTask", () => {
  it("returns an Inbox task with the approved defaults", () => {
    const task = createInboxTask({
      title: "Capture title",
      id: "task-test-1",
      now: "2026-08-06T12:00:00.000Z",
    });

    expect(task).toEqual({
      id: "task-test-1",
      title: "Capture title",
      projectId: null,
      status: "inbox",
      priority: "medium",
      ownerId: PROTOTYPE_OWNER_ID,
      dueDate: null,
      riskRoute: "standard",
      blockedReason: null,
      createdAt: "2026-08-06T12:00:00.000Z",
      updatedAt: "2026-08-06T12:00:00.000Z",
    });
  });
});
