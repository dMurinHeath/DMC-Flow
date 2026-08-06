import type { Task } from "@/lib/domain/task";
import { PROTOTYPE_OWNER_ID } from "./types";

export function createInboxTask(input: {
  title: string;
  id: string;
  now: string;
}): Task {
  return {
    id: input.id,
    title: input.title,
    projectId: null,
    status: "inbox",
    priority: "medium",
    ownerId: PROTOTYPE_OWNER_ID,
    dueDate: null,
    riskRoute: "standard",
    blockedReason: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
