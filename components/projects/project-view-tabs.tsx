import Link from "next/link";
import type { ReactNode } from "react";

type ProjectViewTabsProps = {
  projectId: string;
  active: "list" | "board";
};

export function ProjectViewTabs({
  projectId,
  active,
}: ProjectViewTabsProps): ReactNode {
  const base = `/projects/${projectId}`;
  const tabClass =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <nav aria-label="Project views" className="flex flex-wrap gap-2">
      <Link
        href={base}
        className={
          active === "list"
            ? `${tabClass} bg-navy text-on-navy`
            : `${tabClass} border border-border bg-surface text-navy hover:bg-canvas`
        }
        aria-current={active === "list" ? "page" : undefined}
      >
        List
      </Link>
      <Link
        href={`${base}/board`}
        className={
          active === "board"
            ? `${tabClass} bg-navy text-on-navy`
            : `${tabClass} border border-border bg-surface text-navy hover:bg-canvas`
        }
        aria-current={active === "board" ? "page" : undefined}
      >
        Board
      </Link>
    </nav>
  );
}
