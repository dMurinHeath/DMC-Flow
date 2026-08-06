import { AppShell } from "@/components/app-shell/app-shell";
import { TaskDetailView } from "@/components/task/task-detail-view";

export default async function TaskDetailPage({
  params,
}: PageProps<"/tasks/[taskId]">) {
  const { taskId } = await params;

  return (
    <AppShell activeNav="my-flow">
      <TaskDetailView taskId={taskId} />
    </AppShell>
  );
}
