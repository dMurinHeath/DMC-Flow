import { AppShell } from "@/components/app-shell/app-shell";
import { MyFlowView } from "@/components/my-flow/my-flow-view";

export default function Home() {
  return (
    <AppShell activeNav="my-flow">
      <MyFlowView />
    </AppShell>
  );
}
