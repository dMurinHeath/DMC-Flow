function SearchIcon() {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function UtilityBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 lg:px-4">
      <div className="relative min-w-0 flex-1 max-w-xl">
        <span
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          aria-hidden
        >
          <SearchIcon />
        </span>
        <input
          type="search"
          disabled
          readOnly
          placeholder="Search tasks"
          aria-label="Search tasks (unavailable)"
          className="h-9 w-full cursor-not-allowed rounded-md border border-border bg-canvas/60 py-2 pr-3 pl-9 text-sm text-muted placeholder:text-muted"
        />
      </div>

      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold tracking-wide text-on-navy"
        aria-label="User DM"
        role="img"
      >
        DM
      </div>
    </header>
  );
}
