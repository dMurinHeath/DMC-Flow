export const PROJECT_HEALTH_VALUES = [
  "on_track",
  "needs_attention",
] as const;

export type ProjectHealth = (typeof PROJECT_HEALTH_VALUES)[number];

export type Project = {
  id: string;
  name: string;
  description: string;
  health: ProjectHealth;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

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
