import type { ReactNode } from "react";
import { SideNav } from "./side-nav";
import { UtilityBar } from "./utility-bar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__side min-w-0">
        <SideNav />
      </div>
      <div className="app-shell__main-column">
        <UtilityBar />
        <main id="main-content" className="app-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
