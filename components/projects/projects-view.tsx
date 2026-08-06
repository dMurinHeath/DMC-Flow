"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { usePrototypeStore } from "@/components/prototype-store/prototype-store-provider";
import {
  applyProjectEdit,
  validateProjectDraft,
  type Project,
  type ProjectDraft,
  type ProjectDraftIssue,
  type ProjectHealth,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
} from "@/lib/domain/project";
import {
  archiveProject,
  createProject,
  restoreProject,
  selectActiveProjects,
  selectArchivedProjects,
} from "@/lib/prototype-store/projects";
import { ProjectForm } from "./project-form";

export type CreateProjectIds = () => { id: string; now: string };
export type GetNowDate = () => Date;

function defaultCreateProjectIds(): { id: string; now: string } {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    now: new Date().toISOString(),
  };
}

function defaultGetNow(): Date {
  return new Date();
}

function emptyDraft(): ProjectDraft {
  return {
    name: "",
    description: "",
    health: "on_track",
  };
}

function draftFromProject(project: Project): ProjectDraft {
  return {
    name: project.name,
    description: project.description,
    health: project.health,
  };
}

function issueMessage(issue: ProjectDraftIssue): string {
  switch (issue.field) {
    case "name":
      return issue.code === "empty"
        ? "Name is required."
        : `Name must be at most ${PROJECT_NAME_MAX_LENGTH} characters.`;
    case "description":
      return `Description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters.`;
  }
}

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: "On track",
  needs_attention: "Needs attention",
};

type ProjectsViewProps = {
  createProjectIds?: CreateProjectIds;
  getNow?: GetNowDate;
};

export function ProjectsView({
  createProjectIds = defaultCreateProjectIds,
  getNow = defaultGetNow,
}: ProjectsViewProps) {
  const { state, hydrated, dispatch } = usePrototypeStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ProjectDraft>(emptyDraft);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProjectDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(
    null,
  );
  const [rowError, setRowError] = useState<{
    projectId: string;
    message: string;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const createNameRef = useRef<HTMLInputElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const archiveConfirmRef = useRef<HTMLButtonElement>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);

  const createNameId = useId();
  const createDescriptionId = useId();
  const createHealthId = useId();
  const createErrorId = useId();
  const editNameId = useId();
  const editDescriptionId = useId();
  const editHealthId = useId();
  const editErrorId = useId();

  const activeProjects = hydrated ? selectActiveProjects(state.projects) : [];
  const archivedProjects = hydrated
    ? selectArchivedProjects(state.projects)
    : [];

  useEffect(() => {
    if (createOpen && createNameRef.current) {
      createNameRef.current.focus();
    }
  }, [createOpen]);

  useEffect(() => {
    if (editingId && editDraft && editNameRef.current) {
      editNameRef.current.focus();
    }
  }, [editingId, editDraft]);

  useEffect(() => {
    if (confirmingArchiveId && archiveConfirmRef.current) {
      archiveConfirmRef.current.focus();
    }
  }, [confirmingArchiveId]);

  function announce(message: string) {
    setAnnouncement(message);
  }

  function openCreate() {
    setCreateDraft(emptyDraft());
    setCreateError(null);
    setCreateOpen(true);
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
    setConfirmingArchiveId(null);
    setRowError(null);
  }

  function closeCreate(options?: { focusTrigger?: boolean }) {
    setCreateOpen(false);
    setCreateDraft(emptyDraft());
    setCreateError(null);
    if (options?.focusTrigger) {
      createTriggerRef.current?.focus();
    }
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!hydrated) {
      return;
    }

    const issues = validateProjectDraft(createDraft);
    if (issues.length > 0) {
      setCreateError(issueMessage(issues[0]!));
      return;
    }

    const { id, now } = createProjectIds();
    const project = createProject({ draft: createDraft, id, now });
    dispatch({ type: "save_project", project });
    announce(`Created project “${project.name}”.`);
    closeCreate({ focusTrigger: true });
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditDraft(draftFromProject(project));
    setEditError(null);
    setCreateOpen(false);
    setConfirmingArchiveId(null);
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  }

  function handleEditSave(event: FormEvent, projectId: string) {
    event.preventDefault();
    if (!hydrated || !editDraft) {
      return;
    }

    const current = state.projects.find(
      (candidate) => candidate.id === projectId,
    );
    if (!current) {
      setEditError("This project is no longer available.");
      return;
    }

    const issues = validateProjectDraft(editDraft);
    if (issues.length > 0) {
      setEditError(issueMessage(issues[0]!));
      return;
    }

    const next = applyProjectEdit(current, editDraft, getNow());
    dispatch({ type: "save_project", project: next });
    announce(`Updated project “${next.name}”.`);
    cancelEdit();
  }

  function startArchiveConfirm(projectId: string) {
    setConfirmingArchiveId(projectId);
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
    setCreateOpen(false);
    setRowError(null);
  }

  function cancelArchiveConfirm() {
    setConfirmingArchiveId(null);
  }

  function confirmArchive(projectId: string) {
    if (!hydrated) {
      return;
    }

    const current = state.projects.find(
      (candidate) => candidate.id === projectId,
    );
    if (!current) {
      setRowError({
        projectId,
        message: "This project is no longer available.",
      });
      setConfirmingArchiveId(null);
      return;
    }

    if (current.archived) {
      setRowError({
        projectId,
        message: "This project is already archived.",
      });
      setConfirmingArchiveId(null);
      return;
    }

    const result = archiveProject({
      project: current,
      tasks: state.tasks,
      now: getNow().toISOString(),
    });

    if (!result.ok) {
      setRowError({ projectId, message: result.message });
      setConfirmingArchiveId(null);
      return;
    }

    dispatch({ type: "save_project", project: result.project });
    announce(`Archived project “${result.project.name}”.`);
    setConfirmingArchiveId(null);
    setRowError(null);
  }

  function handleRestore(projectId: string) {
    if (!hydrated) {
      return;
    }

    const current = state.projects.find(
      (candidate) => candidate.id === projectId,
    );
    if (!current) {
      setRowError({
        projectId,
        message: "This project is no longer available.",
      });
      return;
    }

    if (!current.archived) {
      setRowError({
        projectId,
        message: "This project is already active.",
      });
      return;
    }

    const next = restoreProject({
      project: current,
      now: getNow().toISOString(),
    });
    dispatch({ type: "save_project", project: next });
    announce(`Restored project “${next.name}”.`);
    setRowError(null);
  }

  function renderProjectRow(
    project: Project,
    options: { archived: boolean },
  ) {
    const isEditing = editingId === project.id && editDraft !== null;
    const isConfirmingArchive = confirmingArchiveId === project.id;
    const thisRowError =
      rowError?.projectId === project.id ? rowError.message : null;

    return (
      <li
        key={project.id}
        className={
          options.archived
            ? "min-w-0 rounded-md border border-border bg-surface/60 px-4 py-3 opacity-80"
            : "min-w-0 rounded-md border border-border bg-surface px-4 py-3"
        }
      >
        {isEditing && editDraft ? (
          <form
            className="flex min-w-0 flex-col gap-3"
            onSubmit={(event) => handleEditSave(event, project.id)}
          >
            <ProjectForm
              draft={editDraft}
              onChange={setEditDraft}
              nameId={`${editNameId}-${project.id}`}
              descriptionId={`${editDescriptionId}-${project.id}`}
              healthId={`${editHealthId}-${project.id}`}
              errorId={`${editErrorId}-${project.id}`}
              errorMessage={editError}
              nameRef={editNameRef as RefObject<HTMLInputElement | null>}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-on-navy"
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : isConfirmingArchive ? (
          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-sm text-navy">
              Archive &ldquo;{project.name}&rdquo;? It will leave active
              project lists until you restore it. Tasks that already reference
              it keep their project name.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                ref={archiveConfirmRef}
                type="button"
                className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-on-navy"
                onClick={() => confirmArchive(project.id)}
              >
                Confirm archive
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
                onClick={cancelArchiveConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-navy break-words">
                {project.name}
              </h3>
              {project.description ? (
                <p className="mt-1 text-sm text-muted break-words">
                  {project.description}
                </p>
              ) : null}
              <p
                className={
                  project.health === "needs_attention"
                    ? "mt-2 text-sm text-amber"
                    : "mt-2 text-sm text-teal"
                }
              >
                {HEALTH_LABELS[project.health]}
              </p>
              {thisRowError ? (
                <p className="mt-2 text-sm text-amber" role="alert">
                  {thisRowError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-navy"
                onClick={() => startEdit(project)}
              >
                Edit
              </button>
              {options.archived ? (
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-navy"
                  onClick={() => handleRestore(project.id)}
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-navy"
                  onClick={() => startArchiveConfirm(project.id)}
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {!hydrated ? (
        <div
          className="rounded-md border border-border bg-surface px-4 py-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-muted">Loading your projects…</p>
        </div>
      ) : (
        <>
          <section className="flex min-w-0 flex-col gap-3" aria-labelledby="active-projects-heading">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <h2
                id="active-projects-heading"
                className="text-lg font-semibold text-navy"
              >
                Active
              </h2>
              {!createOpen ? (
                <button
                  ref={createTriggerRef}
                  type="button"
                  className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-on-navy"
                  onClick={openCreate}
                >
                  New project
                </button>
              ) : null}
            </div>

            {createOpen ? (
              <form
                className="min-w-0 rounded-md border border-border bg-surface px-4 py-3"
                onSubmit={handleCreate}
              >
                <h3 className="text-sm font-medium text-navy">New project</h3>
                <div className="mt-3">
                  <ProjectForm
                    draft={createDraft}
                    onChange={setCreateDraft}
                    nameId={createNameId}
                    descriptionId={createDescriptionId}
                    healthId={createHealthId}
                    errorId={createErrorId}
                    errorMessage={createError}
                    nameRef={createNameRef}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-on-navy"
                  >
                    Create project
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-navy"
                    onClick={() => closeCreate({ focusTrigger: true })}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {activeProjects.length === 0 ? (
              <div className="rounded-md border border-border bg-surface px-4 py-6">
                <p className="text-sm text-navy">No active projects.</p>
                <p className="mt-2 text-sm text-muted">
                  Create a project to assign tasks during Inbox triage.
                </p>
              </div>
            ) : (
              <ul className="flex min-w-0 flex-col gap-3">
                {activeProjects.map((project) =>
                  renderProjectRow(project, { archived: false }),
                )}
              </ul>
            )}
          </section>

          <section
            className="flex min-w-0 flex-col gap-3"
            aria-labelledby="archived-projects-heading"
          >
            <h2
              id="archived-projects-heading"
              className="text-lg font-semibold text-navy"
            >
              Archived
            </h2>
            {archivedProjects.length === 0 ? (
              <p className="text-sm text-muted">No archived projects.</p>
            ) : (
              <ul className="flex min-w-0 flex-col gap-3">
                {archivedProjects.map((project) =>
                  renderProjectRow(project, { archived: true }),
                )}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
