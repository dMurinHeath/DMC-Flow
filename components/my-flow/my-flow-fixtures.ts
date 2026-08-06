export type SummaryEmphasis = "teal" | "amber";

export type MyFlowSummaryItem = {
  label: string;
  value: string;
  emphasis: SummaryEmphasis;
};

export type MyFlowTaskRow = {
  title: string;
  project: string;
  due: string;
  ownerInitials: string;
};

export type MyFlowProjectHealth = {
  name: string;
  status: "On track" | "Needs attention";
  emphasis: SummaryEmphasis;
};

export type MyFlowDashboardData = {
  eyebrow: string;
  heading: string;
  supportingText: string;
  summary: MyFlowSummaryItem[];
  nowTasks: MyFlowTaskRow[];
  nextTasks: MyFlowTaskRow[];
  nextTotalLabel: string;
  reviewQueue: string[];
  projectHealth: MyFlowProjectHealth[];
};

export const myFlowFixture: MyFlowDashboardData = {
  eyebrow: "MY FLOW",
  heading: "Good morning, Danilo",
  supportingText: "A clear view of what needs your attention.",
  summary: [
    { label: "Now", value: "3", emphasis: "teal" },
    { label: "Next", value: "5", emphasis: "teal" },
    { label: "Reviews", value: "2", emphasis: "teal" },
    { label: "Blocked", value: "1", emphasis: "amber" },
  ],
  nowTasks: [
    {
      title: "Approve Flow Gate specification",
      project: "DMC Flow Pilot",
      due: "Today",
      ownerInitials: "DM",
    },
    {
      title: "Prototype task detail",
      project: "DMC Flow Pilot",
      due: "Today",
      ownerInitials: "DM",
    },
    {
      title: "Review AWS deployment options",
      project: "Cloud Platform",
      due: "Tomorrow",
      ownerInitials: "DM",
    },
  ],
  nextTasks: [
    {
      title: "Define acceptance criteria",
      project: "DMC Flow Pilot",
      due: "Friday",
      ownerInitials: "DM",
    },
    {
      title: "Prepare user research plan",
      project: "Cloud Platform",
      due: "Next week",
      ownerInitials: "DM",
    },
  ],
  nextTotalLabel: "View all 5",
  reviewQueue: ["Tenant isolation tests", "Project board interactions"],
  projectHealth: [
    {
      name: "DMC Flow Pilot",
      status: "On track",
      emphasis: "teal",
    },
    {
      name: "Cloud Platform",
      status: "Needs attention",
      emphasis: "amber",
    },
  ],
};
