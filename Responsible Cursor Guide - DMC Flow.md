# Responsible Cursor Guide - DMC Flow

This is a practical pilot workflow for progressing `dMurinHeath/DMC-Flow` in Cursor while following **Responsible Cursor Programming Framework - DMC Digital v0.1**. The framework is a proposal, not yet adopted policy.

## Current repository position

- Fresh Next.js 16.3 App Router project with React 19.2, strict TypeScript, Tailwind CSS 4 and npm.
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css` and the README are still create-next-app defaults.
- `AGENTS.md` contains only Next.js-generated guidance; `CLAUDE.md` points to it.
- No automated tests, CI workflow, project-specific Cursor rules/commands, PR template or CODEOWNERS yet.
- Verified baseline: `npm run lint` passes; `next typegen && tsc --noEmit` passes; `npm run build` passes when Google Fonts is reachable.
- The current build fetches Geist from Google. For repeatable offline/CI builds and DMC branding, replace it with an approved self-hosted font or a temporary system-font stack in a separate approved chunk.

## Build the project in this order

Treat every item as its own reviewed chunk. Do not ask Cursor to build the whole application in one conversation.

1. **Governance (Standard):** add the project contract, three rules, three commands, `.cursorignore`, PR template, CODEOWNERS and baseline scripts shown below.
2. **Stable baseline (Standard):** make font loading deterministic; replace starter metadata; confirm lint, generated route types and build all pass.
3. **DMC shell (Standard):** implement only the navigation, design tokens and responsive application frame from the approved mock-ups. No data, auth or new packages.
4. **My Flow UI (Standard):** implement the static dashboard with typed fixture data, accessibility states and component tests.
5. **Task domain (Controlled):** approve task/status/risk contracts, then add pure domain types, validation and human-authored tests before persistence.
6. **Persistence and workspaces (Controlled; Restricted for migrations):** choose the database deliberately; design ownership and failure behaviour; review migrations manually.
7. **Authentication and tenant isolation (Restricted):** keep the security contract and command sequence human-controlled; require hostile-identifier and cross-workspace tests plus specialist review.
8. **Flow Gate (Controlled/Restricted):** add evidence, risk route, reviewer and approval records. Treat any permission or audit-integrity change as Restricted.
9. **Deployment (Restricted):** use separate infrastructure review, least-privilege credentials, explicit command approval and rollback evidence.

Do not add a responsible-change Skill, hooks, production MCP access or subagent orchestration yet. Exercise the three commands across several ordinary changes first; automate only deterministic checks that have proved useful.

## Routine for every chunk

1. **Open safely.** Create a non-production branch; run `git status`, `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`. Record any existing failure.
2. **Understand without editing.** Use Cursor Ask mode. Run `/plan-chunk` and provide one observable objective.
3. **Screen risk.** Use **Standard**, **Controlled** or **Restricted**. If uncertain, choose the more restrictive route.
4. **Approve the contract.** A human approves Context, Objective, Constraints, Contract, Done-test, Out of scope, affected files and command permissions.
5. **Implement once.** Switch to Agent mode for the approved files only. Stop if a new file, package, protected boundary or changed contract becomes necessary.
6. **Review the real diff.** Run `/review-chunk`; then personally inspect every changed line. Do not rely on Cursor's summary.
7. **Verify.** Run the approved done-test plus project checks. Read the assertions and failure cases; add at least one human-authored test for consequential behaviour.
8. **Explain.** With chat closed, explain purpose, control flow, failure modes, security assumptions and evidence.
9. **Prepare and commit.** Run `/prepare-commit`. Commit one reversible chunk and open a PR containing the evidence.
10. **Learn.** Record repeated failures as candidates for a rule, test, command or deterministic check. Do not add prompt rules for one-off preferences.

Stop immediately if scope expands, a requirement or security assumption is unclear, production/live data becomes reachable, a test must be weakened, a new package appears without approval, or you cannot explain a changed line.

## Copy-ready repository setup

### 1. Replace `AGENTS.md`

Retain the Next.js-generated block because `next dev` recreates it. Replace the file with:

```md
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

## Canonical commands

- Install: `npm ci`
- Develop: `npm run dev`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Production build: `npm run build`
- Full current gate: `npm run check`

There is no approved automated test stack yet. Do not claim tests pass. The first logic-bearing feature must propose and obtain approval for a test approach before adding dependencies.

## Architecture boundaries

- `app/`: routes, layouts and route-level composition.
- `components/`: reusable presentation components with no data-store access.
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
```

### 2. Update the `package.json` scripts

Replace only the `scripts` object with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit",
  "check": "npm run lint && npm run typecheck && npm run build"
}
```

`next typegen` is required because this repository uses the generated `LayoutProps<"/">` helper.

### 3. Create `.cursor/rules/00-workflow.mdc`

```md
---
description: Apply the DMC controlled-change lifecycle to every implementation task.
globs:
alwaysApply: true
---

# Controlled-change workflow

- Begin in read-only Ask/Plan mode.
- Define Context, Objective, Constraints, Contract, Done-test and Out of scope.
- State affected files, assumptions, risk route and requested command permissions.
- Do not edit until a human explicitly approves the plan.
- Implement one objective with the smallest coherent diff.
- Stop if scope, contract, dependencies, risk or required files change.
- Never hide baseline failures or weaken a check to make it pass.
- Review the complete diff and preserve verification evidence before commit.
- Cursor must not commit, push, merge, deploy or run destructive commands unless the human explicitly asks for that exact action.
```

### 4. Create `.cursor/rules/architecture.mdc`

```md
---
description: Apply DMC Flow architecture constraints when changing TypeScript or React files.
globs: "**/*.{ts,tsx}"
alwaysApply: false
---

# DMC Flow architecture

- Read the relevant local Next.js 16 guide in `node_modules/next/dist/docs/` before using or changing framework conventions.
- Use Server Components by default; justify every `"use client"` boundary.
- Keep route composition in `app/`, reusable UI in `components/`, pure business rules in `lib/domain/`, and privileged I/O in `lib/server/`.
- Client Components must not import `lib/server/` or access persistence directly.
- Keep domain logic independent of React and Next.js where practical.
- Reuse existing patterns; do not add speculative layers, duplicate capability or unrelated refactoring.
- Do not add a dependency without verifying its package identity, maintenance, licence, need and approved risk route.
```

### 5. Create `.cursor/rules/security.mdc`

```md
---
description: Apply when work touches auth, permissions, tenancy, secrets, personal data, validation, persistence, external APIs, infrastructure or deployment.
globs:
alwaysApply: false
---

# Security stop-points

- Classify this work as Controlled or Restricted before editing.
- Report the protected boundary, likely blast radius, uncertainty and required reviewer.
- Keep credentials and live data outside Cursor's reachable environment.
- Enforce authorisation and tenant boundaries on the server for every read and mutation.
- Treat identifiers as hostile input; test cross-workspace and unauthorised cases.
- Use synthetic/local data and least-privilege identities.
- Require explicit human approval for migrations, deployment, infrastructure, database and resource-deletion commands.
- Stop if the threat model, data ownership, failure behaviour or rollback route is unclear.
```

### 6. Create `.cursor/commands/plan-chunk.md`

```md
Plan one bounded DMC Flow change. Remain read-only: do not edit files, install packages or run mutating commands.

Inspect `AGENTS.md`, applicable project rules, the current implementation, nearby examples and relevant recent history.

Return:

1. Context
2. Objective - one observable outcome
3. Constraints
4. Contract - interfaces, types, ownership, errors and side effects
5. Done-test - success, failure and relevant edge cases
6. Out of scope
7. Affected files
8. Assumptions and unresolved questions
9. Risk route - Standard, Controlled or Restricted, with triggers
10. Minimal implementation plan
11. Commands/permissions requested

If an assumption cannot be validated, recommend pausing or reducing scope. End with: **Awaiting human plan approval; no implementation performed.**
```

### 7. Create `.cursor/commands/review-chunk.md`

```md
Review the complete current diff against the human-approved chunk. Do not edit files unless explicitly asked after the review.

Inspect every changed line and report:

1. Verdict - PASS, CHANGES REQUIRED or ESCALATE
2. Scope - unrelated, missing or unexplained changes
3. Correctness - inputs, outputs, state, failures and edge cases
4. Security - validation, authorisation, tenancy, secrets, injection and exposure
5. Architecture - dependency direction, reuse and coupling
6. Maintainability - duplication, naming and avoidable complexity
7. Tests - assertion quality, failure cases and human-authored consequential test
8. Evidence - commands run and exact outcomes
9. Explainability questions the developer must answer

For each finding, give severity, file/line, why it matters and the smallest correction. Do not treat an agent-authored review as independent human approval.
```

### 8. Create `.cursor/commands/prepare-commit.md`

```md
Assess whether the approved chunk is ready to commit. Do not commit, push or open a PR.

1. Show the final changed-file list and confirm scope.
2. Run the approved done-test and `npm run check`.
3. Record exact results and distinguish baseline failures from new failures.
4. List every unresolved warning, assumption, TODO and required reviewer.
5. Ask the developer to explain purpose, control flow, failure modes and security assumptions.
6. Confirm the complete diff received human review.
7. Propose a concise commit message explaining what changed and why.
8. Provide a PR verification summary and AI-assistance disclosure.

Return READY or NOT READY. Any material uncertainty, failed check or missing review means NOT READY.
```

### 9. Create `.cursorignore`

```gitignore
# Dependencies and generated output
node_modules/
.next/
out/
build/
coverage/

# Credentials and local configuration
.env*
!.env.example
*.pem
*.key
*.p12
*.pfx

# Local data and provider state
*.db
*.sqlite*
.vercel/

# Logs and noise
*.log
.DS_Store
```

This is context hygiene, not a security boundary. Do not place usable production credentials in Cursor's reachable environment.

### 10. Create `.github/pull_request_template.md`

```md
## Objective

<!-- One observable outcome. -->

## Approved chunk

- **Context:**
- **Constraints:**
- **Contract:**
- **Done-test:**
- **Out of scope:**

## Risk route

- [ ] Standard
- [ ] Controlled
- [ ] Restricted

Triggers/reviewer:

## What changed and why

<!-- Explain the important implementation decision, not a file list. -->

## Verification evidence

| Check | Result |
| --- | --- |
| Done-test | |
| `npm run lint` | |
| `npm run typecheck` | |
| `npm run build` | |
| Tests, when configured | |

## Human review

- [ ] I reviewed every changed line.
- [ ] The diff matches the approved scope and out-of-scope boundary.
- [ ] I can explain the control flow, failure modes and security assumptions.
- [ ] Assertions and failure cases were inspected, not only pass/fail output.
- [ ] Required specialist/CODEOWNER review is complete.

## AI assistance

<!-- State how Cursor assisted and what the human independently verified. -->
```

### 11. Create `.github/CODEOWNERS`

```text
* @dMurinHeath
/.cursor/ @dMurinHeath
/AGENTS.md @dMurinHeath
/app/ @dMurinHeath
/lib/server/ @dMurinHeath
```

Replace or extend these owners when another qualified reviewer joins; Restricted work should not be self-approved where independent review is required.

### 12. Create `.github/workflows/quality.yml`

Add this after `npm run check` is stable locally:

```yaml
name: Quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: npm
      - run: npm ci
      - run: npm run check
```

Then protect `main`: require pull requests, require the **Quality** check, require CODEOWNER review where available, dismiss stale approvals and prohibit force pushes/deletion.

## First Cursor chunk to run after governance

Use `/plan-chunk` with:

```text
Objective: Make the current DMC Flow starter deterministic and correctly branded at the document level.

Allowed scope:
- Add the typecheck/check scripts.
- Change app/layout.tsx metadata from create-next-app to DMC Flow.
- Replace the Google-hosted Geist dependency with an approved local font asset if one exists; otherwise use a temporary system-font stack.
- Preserve the current page content and behaviour.

Done-test:
- npm run lint passes.
- npm run typecheck passes from a clean checkout.
- npm run build passes without fetching a font from the public internet.
- The browser title is DMC Flow.

Out of scope:
- UI redesign, navigation, task data, persistence, authentication, new packages and deployment.
```

Approve that plan before switching from Ask/Plan to Agent mode. The next chunk can then replace the starter page with only the DMC Flow application shell.

## Reference links

- Repository: <https://github.com/dMurinHeath/DMC-Flow>
- Cursor Rules: <https://docs.cursor.com/context/rules-for-ai>
- Cursor Commands: <https://docs.cursor.com/en/agent/chat/commands>
- Cursor modes and permissions: <https://docs.cursor.com/agent>
