<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DMC Flow operating contract

## Purpose

DMC Flow is a calm, accountable task manager built around My Flow, project boards and evidence-based Flow Gate reviews.

Current non-goals: production deployment, live credentials, authentication, tenancy, database migrations and third-party integrations unless each is approved as a separate risk-routed chunk.

## Stack

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Tailwind CSS 4
- npm with the committed `package-lock.json`
- Server Components by default; add `"use client"` only where browser state or APIs require it
- Approved automated tests: Vitest, jsdom and Testing Library (`npm test` / included in `npm run check`)

## Canonical commands

- Install: `npm ci`
- Develop: `npm run dev`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Test: `npm test`
- Production build: `npm run build`
- Full current gate: `npm run check`

## Architecture boundaries

- `app/`: routes, layouts and route-level composition.
- `components/`: reusable presentational components receive props and do not access a data store directly. Feature-level Client Components may consume the browser prototype store (for example via `usePrototypeStore()`).
- `lib/domain/`: framework-independent types, validation and business rules.
- `lib/server/`: server-only persistence, secrets and external integrations.
- Client Components must not import `lib/server/`.
- UI must not access a database or privileged external service directly.
- Reuse established components and patterns; do not create speculative abstractions.

## Protected boundaries

Stop and request a more restrictive route before changing authentication, authorisation, tenancy, secrets, personal data, schemas, migrations, destructive operations, dependencies, infrastructure, deployment or production configuration.

Never expose production credentials, paste secrets into chat, weaken types/validation/tests to pass a check, or combine the objective with unrelated refactoring.

## Required chunk contract

Before editing, provide and obtain human approval for:

1. Context
2. Objective
3. Constraints
4. Contract
5. Done-test
6. Out of scope

Also identify affected files, assumptions, risk route and required command permissions. Implement one approved chunk only and stop when the boundary no longer fits.

## Definition of Done

- The complete diff matches the approved objective and out-of-scope boundary.
- The developer can explain the implementation and failure modes independently.
- The agreed done-test, lint, type-check and build pass against the final diff.
- Security, data exposure, authorisation and side effects were reviewed where relevant.
- Existing architecture and dependency direction are preserved.
- The commit/PR records why the change exists, how it was verified and any AI assistance.
- A human has reviewed every changed line before commit; required specialist/CODEOWNER review is complete.