import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export default async function ProjectDetailPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;

  return (
    <AppShell activeNav="projects">
      <ProjectDetailView projectId={projectId} />
    </AppShell>
  );
}
