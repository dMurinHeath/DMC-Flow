import Image from "next/image";
import Link from "next/link";

const NAV_ITEMS = [
  { id: "my-flow", label: "My Flow", current: true },
  { id: "inbox", label: "Inbox", current: false },
  { id: "reviews", label: "Reviews", current: false },
  { id: "projects", label: "Projects", current: false },
] as const;

function NavIcon({ name }: { name: (typeof NAV_ITEMS)[number]["id"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "my-flow":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M4 13h4l2 3h4l2-3h4v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" />
          <path d="M4 13 6.5 5h11L20 13" />
        </svg>
      );
    case "reviews":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
          <path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      );
  }
}

function BuildingIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20V6l8-3 8 3v14" />
      <path d="M9 20v-5h6v5" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

export function SideNav() {
  return (
    <aside className="side-nav flex h-full flex-col bg-navy text-on-navy lg:min-h-dvh">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 lg:px-4 lg:py-4">
        <Image
          src="/brand/DMC-Logo.avif"
          alt="DMC Digital"
          width={438}
          height={110}
          className="h-7 w-auto max-w-[148px] object-contain object-left lg:h-8 lg:max-w-[168px]"
          priority
        />
        <span className="text-[10px] font-semibold tracking-[0.18em] text-teal uppercase">
          Flow
        </span>
      </div>

      <nav aria-label="Primary" className="flex-1 px-2 py-3 lg:px-3 lg:py-4">
        <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible lg:gap-1">
          {NAV_ITEMS.map((item) => {
            const baseClass =
              "relative flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors";

            if (item.current) {
              return (
                <li key={item.id}>
                  <Link
                    href="/"
                    className={`${baseClass} bg-navy-raised text-on-navy before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-teal`}
                    aria-current="page"
                  >
                    <NavIcon name={item.id} />
                    {item.label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <span
                  className={`${baseClass} cursor-not-allowed text-on-navy/45`}
                  aria-disabled="true"
                >
                  <NavIcon name={item.id} />
                  <span>
                    {item.label}
                    <span className="sr-only"> (unavailable)</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-3">
        <div
          className="flex items-center gap-2 text-sm text-on-navy/80"
          aria-label="Workspace DMC Digital"
        >
          <BuildingIcon />
          <span>DMC Digital</span>
        </div>
      </div>
    </aside>
  );
}
