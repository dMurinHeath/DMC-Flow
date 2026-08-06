import type { ReactNode } from "react";
import { SideNav, type PrimaryNavItem } from "./side-nav";
import { UtilityBar } from "./utility-bar";

export type { PrimaryNavItem };

type AppShellProps = {
  children: ReactNode;
  activeNav: PrimaryNavItem;
};

export function AppShell({ children, activeNav }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__side min-w-0">
        <SideNav activeNav={activeNav} />
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
