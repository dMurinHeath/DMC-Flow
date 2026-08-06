import { AppShell } from "@/components/app-shell/app-shell";
import { InboxView } from "@/components/inbox/inbox-view";

export default function InboxPage() {
  return (
    <AppShell activeNav="inbox">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">
            Capture
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy lg:text-3xl">
            Inbox
          </h1>
          <p className="mt-2 text-sm text-muted lg:text-base">
            Triage captured tasks into an active project, or remove items you no
            longer need.
          </p>
        </header>
        <InboxView />
      </div>
    </AppShell>
  );
}
