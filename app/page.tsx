import { AppShell } from "@/components/app-shell/app-shell";
import { MyFlowDashboard } from "@/components/my-flow/my-flow-dashboard";
import { myFlowFixture } from "@/components/my-flow/my-flow-fixtures";

export default function Home() {
  return (
    <AppShell activeNav="my-flow">
      <MyFlowDashboard data={myFlowFixture} />
    </AppShell>
  );
}
