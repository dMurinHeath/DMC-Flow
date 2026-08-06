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

export function isProjectHealth(value: unknown): value is ProjectHealth {
  return (
    typeof value === "string" &&
    (PROJECT_HEALTH_VALUES as readonly string[]).includes(value)
  );
}
