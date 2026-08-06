import type { Project } from "@/lib/domain/project";
import type { Task } from "@/lib/domain/task";
import type { PrototypeState } from "./types";

export const PROTOTYPE_OWNER_ID = "user-dm";
export const PROJECT_ID_DMC_FLOW_PILOT = "proj-dmc-flow-pilot";
export const PROJECT_ID_CLOUD_PLATFORM = "proj-cloud-platform";

const SEED_TIMESTAMP = "2026-08-01T10:00:00.000Z";

function project(
  partial: Omit<Project, "createdAt" | "updatedAt" | "archived"> & {
    archived?: boolean;
  },
): Project {
  return {
    archived: false,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ...partial,
  };
}

function task(
  partial: Omit<Task, "createdAt" | "updatedAt" | "ownerId" | "blockedReason"> & {
    ownerId?: string | null;
    blockedReason?: string | null;
  },
): Task {
  return {
    ownerId: PROTOTYPE_OWNER_ID,
    blockedReason: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    ...partial,
  };
}

export function createPrototypeSeedState(): PrototypeState {
  const projects: Project[] = [
    project({
      id: PROJECT_ID_DMC_FLOW_PILOT,
      name: "DMC Flow Pilot",
      description:
        "Build and validate the first responsible delivery workflow.",
      health: "on_track",
    }),
    project({
      id: PROJECT_ID_CLOUD_PLATFORM,
      name: "Cloud Platform",
      description: "Stabilize shared cloud platform delivery.",
      health: "needs_attention",
    }),
  ];

  const tasks: Task[] = [
    task({
      id: "task-approve-flow-gate",
      title: "Approve Flow Gate specification",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "in_progress",
      priority: "high",
      dueDate: "2026-08-06",
      riskRoute: "controlled",
    }),
    task({
      id: "task-prototype-task-detail",
      title: "Prototype task detail",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "in_progress",
      priority: "medium",
      dueDate: "2026-08-06",
      riskRoute: "standard",
    }),
    task({
      id: "task-review-aws-deployment",
      title: "Review AWS deployment options",
      projectId: PROJECT_ID_CLOUD_PLATFORM,
      status: "in_progress",
      priority: "high",
      dueDate: "2026-08-07",
      riskRoute: "controlled",
      blockedReason: "Waiting on architecture decision",
    }),
    task({
      id: "task-define-acceptance-criteria",
      title: "Define acceptance criteria",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "ready",
      priority: "medium",
      dueDate: "2026-08-08",
      riskRoute: "standard",
    }),
    task({
      id: "task-prepare-user-research",
      title: "Prepare user research plan",
      projectId: PROJECT_ID_CLOUD_PLATFORM,
      status: "ready",
      priority: "medium",
      dueDate: "2026-08-11",
      riskRoute: "standard",
    }),
    task({
      id: "task-accessible-board-movement",
      title: "Accessible board movement",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "ready",
      priority: "low",
      dueDate: "2026-08-12",
      riskRoute: "standard",
    }),
    task({
      id: "task-map-onboarding-journey",
      title: "Map onboarding journey",
      projectId: PROJECT_ID_CLOUD_PLATFORM,
      status: "ready",
      priority: "low",
      dueDate: "2026-08-13",
      riskRoute: "standard",
    }),
    task({
      id: "task-draft-flow-gate-specification",
      title: "Draft Flow Gate specification",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "ready",
      priority: "medium",
      dueDate: "2026-08-14",
      riskRoute: "controlled",
    }),
    task({
      id: "task-tenant-isolation-tests",
      title: "Tenant isolation tests",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "review",
      priority: "high",
      dueDate: "2026-08-06",
      riskRoute: "restricted",
    }),
    task({
      id: "task-project-board-interactions",
      title: "Project board interactions",
      projectId: PROJECT_ID_DMC_FLOW_PILOT,
      status: "review",
      priority: "medium",
      dueDate: "2026-08-07",
      riskRoute: "controlled",
    }),
  ];

  return {
    projects: projects.map((item) => ({ ...item })),
    tasks: tasks.map((item) => ({ ...item })),
  };
}
