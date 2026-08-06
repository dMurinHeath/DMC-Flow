import {
  MY_FLOW_COPY,
  type MyFlowDashboardData,
} from "@/lib/prototype-store/my-flow";

export type {
  MyFlowDashboardData,
  MyFlowProjectHealth,
  MyFlowReviewItem,
  MyFlowSummaryItem,
  MyFlowTaskRow,
  SummaryEmphasis,
} from "@/lib/prototype-store/my-flow";

export { MY_FLOW_COPY };

export const myFlowFixture: MyFlowDashboardData = {
  ...MY_FLOW_COPY,
  summary: [
    { label: "Now", value: "3", emphasis: "teal" },
    { label: "Next", value: "5", emphasis: "teal" },
    { label: "Reviews", value: "2", emphasis: "teal" },
    { label: "Blocked", value: "1", emphasis: "amber" },
  ],
  nowTasks: [
    {
      id: "task-approve-flow-gate",
      title: "Approve Flow Gate specification",
      project: "DMC Flow Pilot",
      due: "Today",
      ownerInitials: "DM",
    },
    {
      id: "task-prototype-task-detail",
      title: "Prototype task detail",
      project: "DMC Flow Pilot",
      due: "Today",
      ownerInitials: "DM",
    },
    {
      id: "task-review-aws-deployment",
      title: "Review AWS deployment options",
      project: "Cloud Platform",
      due: "Tomorrow",
      ownerInitials: "DM",
    },
  ],
  nextTasks: [
    {
      id: "task-define-acceptance-criteria",
      title: "Define acceptance criteria",
      project: "DMC Flow Pilot",
      due: "Saturday",
      ownerInitials: "DM",
    },
    {
      id: "task-prepare-user-research",
      title: "Prepare user research plan",
      project: "Cloud Platform",
      due: "Tuesday",
      ownerInitials: "DM",
    },
  ],
  nextTotalLabel: "View all 5",
  reviewQueue: [
    {
      id: "task-tenant-isolation-tests",
      title: "Tenant isolation tests",
    },
    {
      id: "task-project-board-interactions",
      title: "Project board interactions",
    },
  ],
  projectHealth: [
    {
      id: "proj-dmc-flow-pilot",
      name: "DMC Flow Pilot",
      status: "On track",
      emphasis: "teal",
    },
    {
      id: "proj-cloud-platform",
      name: "Cloud Platform",
      status: "Needs attention",
      emphasis: "amber",
    },
  ],
};
