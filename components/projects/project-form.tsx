"use client";

import type { RefObject } from "react";
import type { ProjectDraft, ProjectHealth } from "@/lib/domain/project";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_HEALTH_VALUES,
  PROJECT_NAME_MAX_LENGTH,
} from "@/lib/domain/project";

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: "On track",
  needs_attention: "Needs attention",
};

type ProjectFormProps = {
  draft: ProjectDraft;
  onChange: (draft: ProjectDraft) => void;
  nameId: string;
  descriptionId: string;
  healthId: string;
  errorId?: string;
  errorMessage?: string | null;
  disabled?: boolean;
  nameRef?: RefObject<HTMLInputElement | null>;
};

export function ProjectForm({
  draft,
  onChange,
  nameId,
  descriptionId,
  healthId,
  errorId,
  errorMessage,
  disabled = false,
  nameRef,
}: ProjectFormProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="min-w-0">
        <label htmlFor={nameId} className="block text-sm font-medium text-navy">
          Name
        </label>
        <input
          ref={nameRef}
          id={nameId}
          type="text"
          value={draft.name}
          maxLength={PROJECT_NAME_MAX_LENGTH}
          disabled={disabled}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage && errorId ? errorId : undefined}
          onChange={(event) =>
            onChange({ ...draft, name: event.target.value })
          }
          className="mt-1 w-full min-w-0 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-navy outline-none focus-visible:ring-2 focus-visible:ring-teal"
        />
      </div>

      <div className="min-w-0">
        <label
          htmlFor={descriptionId}
          className="block text-sm font-medium text-navy"
        >
          Description
        </label>
        <textarea
          id={descriptionId}
          value={draft.description}
          maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
          disabled={disabled}
          rows={3}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
          className="mt-1 w-full min-w-0 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-navy outline-none focus-visible:ring-2 focus-visible:ring-teal"
        />
      </div>

      <div className="min-w-0">
        <label htmlFor={healthId} className="block text-sm font-medium text-navy">
          Health
        </label>
        <select
          id={healthId}
          value={draft.health}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...draft,
              health: event.target.value as ProjectHealth,
            })
          }
          className="mt-1 w-full min-w-0 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-navy outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {PROJECT_HEALTH_VALUES.map((value) => (
            <option key={value} value={value}>
              {HEALTH_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {errorMessage ? (
        <p id={errorId} className="text-sm text-amber" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
