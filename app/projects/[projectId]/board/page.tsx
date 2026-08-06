import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectBoardView } from "@/components/projects/project-board-view";

export default async function ProjectBoardPage({
  params,
}: PageProps<"/projects/[projectId]/board">) {
  const { projectId } = await params;

  return (
    <AppShell activeNav="projects">
      <ProjectBoardView projectId={projectId} />
    </AppShell>
  );
}
