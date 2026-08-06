"use client";

import { useSearchParams } from "next/navigation";
import { ProjectBoardView } from "./project-board-view";
import { ProjectDetailView } from "./project-detail-view";

type ProjectRouteParamsProps = {
  view: "list" | "board";
};

export function ProjectRouteParams({ view }: ProjectRouteParamsProps) {
  const id = useSearchParams().get("id") ?? "";
  return view === "list" ? (
    <ProjectDetailView projectId={id} />
  ) : (
    <ProjectBoardView projectId={id} />
  );
}
