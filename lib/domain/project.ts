export const PROJECT_HEALTH_VALUES = [
  "on_track",
  "needs_attention",
] as const;

export type ProjectHealth = (typeof PROJECT_HEALTH_VALUES)[number];

export const PROJECT_NAME_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500;

export type Project = {
  id: string;
  name: string;
  description: string;
  health: ProjectHealth;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDraft = {
  name: string;
  description: string;
  health: ProjectHealth;
};

export type ProjectDraftIssue =
  | { field: "name"; code: "empty" | "too_long" }
  | { field: "description"; code: "too_long" };

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

export function isProjectHealth(value: unknown): value is ProjectHealth {
  return (
    typeof value === "string" &&
    (PROJECT_HEALTH_VALUES as readonly string[]).includes(value)
  );
}

export function isProject(value: unknown): value is Project {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isProjectHealth(value.health) &&
    typeof value.archived === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function validateProjectDraft(draft: ProjectDraft): ProjectDraftIssue[] {
  const issues: ProjectDraftIssue[] = [];
  const name = draft.name.trim();
  const description = draft.description.trim();

  if (name.length === 0) {
    issues.push({ field: "name", code: "empty" });
  } else if (name.length > PROJECT_NAME_MAX_LENGTH) {
    issues.push({ field: "name", code: "too_long" });
  }

  if (description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    issues.push({ field: "description", code: "too_long" });
  }

  return issues;
}

export function applyProjectEdit(
  project: Project,
  draft: ProjectDraft,
  now: Date,
): Project {
  return {
    ...project,
    name: draft.name.trim(),
    description: draft.description.trim(),
    health: draft.health,
    updatedAt: now.toISOString(),
  };
}
