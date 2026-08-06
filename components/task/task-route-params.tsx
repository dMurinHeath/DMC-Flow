"use client";

import { useSearchParams } from "next/navigation";
import { TaskDetailView } from "./task-detail-view";

export function TaskRouteParams() {
  const id = useSearchParams().get("id") ?? "";
  return <TaskDetailView taskId={id} />;
}
