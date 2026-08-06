import { AppShell } from "@/components/app-shell/app-shell";
import { ProjectsView } from "@/components/projects/projects-view";

export default function ProjectsPage() {
  return (
    <AppShell activeNav="projects">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">
            Workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy lg:text-3xl">
            Projects
          </h1>
          <p className="mt-2 text-sm text-muted lg:text-base">
            Create and maintain active projects, or restore archived ones when
            you need them again.
          </p>
        </header>
        <ProjectsView />
      </div>
    </AppShell>
  );
}
