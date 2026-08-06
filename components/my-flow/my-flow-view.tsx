"use client";

import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import { MyFlowDashboard } from "./my-flow-dashboard";
import {
  MY_FLOW_COPY,
  buildMyFlowDashboard,
} from "@/lib/prototype-store/my-flow";

export type GetToday = () => string;

function defaultGetToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type MyFlowViewProps = {
  getToday?: GetToday;
};

export function MyFlowView({ getToday = defaultGetToday }: MyFlowViewProps) {
  const { state, hydrated } = usePrototypeStore();

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <header className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">
            {MY_FLOW_COPY.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy lg:text-3xl">
            {MY_FLOW_COPY.heading}
          </h1>
          <p className="mt-2 text-sm text-muted lg:text-base">
            {MY_FLOW_COPY.supportingText}
          </p>
        </header>
        <div
          className="rounded-md border border-border bg-surface px-4 py-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-muted">Loading your My Flow…</p>
        </div>
      </div>
    );
  }

  const data = buildMyFlowDashboard(state, { today: getToday() });
  return <MyFlowDashboard data={data} />;
}
