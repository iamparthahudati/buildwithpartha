import { useState, useMemo } from "react";
import { Plus, Search, Filter } from "lucide-react";
import {
  PageHeader,
  Tabs,
  SortControl,
  ViewToggle,
  Pagination,
  type TabItem,
  type SortOption,
} from "@components/navigation";
import { Button, TextInput, Select, Text, Skeleton } from "@components/ui";
import { EmptyState, ErrorState, ConfirmDialog, DetailPanel } from "@components/feedback";
import { ProjectRow } from "./ProjectRow";
import { ProjectCard } from "./ProjectCard";
import { ProjectForm, type ProjectFormData } from "./ProjectForm";
import { ProjectSummaryMetrics, type ProjectFilterCategory } from "./ProjectSummaryMetrics";
import type { Project, ProjectStatus, ProjectPriority, ProjectHealth } from "../model/project";
import "./projects-screen.css";

const MOCK_DEFAULT_PROJECTS: readonly Project[] = [
  {
    id: "proj-1",
    name: "Launch Platform v1",
    description: "Deploy the engineering foundations and core screens.",
    status: "ACTIVE",
    priority: "P1",
    health: "ON_TRACK",
    color: "blue",
    icon: "rocket",
    startDate: "2026-08-01",
    deadlineDate: "2026-08-30",
    completedTasksCount: 4,
    totalTasksCount: 10,
    updatedAt: "2026-08-20T12:00:00Z",
    version: 1,
  },
  {
    id: "proj-2",
    name: "Mobile PWA Expansion",
    description: "Offline sync and responsive touch targets for mobile.",
    status: "ACTIVE",
    priority: "P2",
    health: "AT_RISK",
    color: "purple",
    icon: "smartphone",
    startDate: "2026-08-15",
    deadlineDate: "2026-09-15",
    completedTasksCount: 2,
    totalTasksCount: 8,
    updatedAt: "2026-08-19T10:00:00Z",
    version: 1,
  },
  {
    id: "proj-3",
    name: "Identity & Security Audit",
    description: "Complete threat modeling, Argon2 hashing, and CSRF tests.",
    status: "COMPLETED",
    priority: "P1",
    health: "ON_TRACK",
    color: "green",
    icon: "shield",
    startDate: "2026-07-01",
    deadlineDate: "2026-08-10",
    completedTasksCount: 12,
    totalTasksCount: 12,
    updatedAt: "2026-08-10T16:00:00Z",
    version: 1,
  },
  {
    id: "proj-4",
    name: "Documentation Refresh",
    description: "Update developer sitemap and component catalog docs.",
    status: "ON_HOLD",
    priority: "P3",
    health: "NOT_SET",
    color: "amber",
    icon: "book",
    startDate: "2026-08-05",
    deadlineDate: "2026-09-30",
    completedTasksCount: 1,
    totalTasksCount: 5,
    updatedAt: "2026-08-14T09:00:00Z",
    version: 1,
  },
  {
    id: "proj-5",
    name: "Legacy System Decommission",
    description: "Archive old database schemas and obsolete endpoints.",
    status: "CANCELLED",
    priority: "P4",
    health: "OFF_TRACK",
    color: "red",
    icon: "trash",
    startDate: "2026-06-01",
    deadlineDate: "2026-07-31",
    archivedAt: "2026-08-01T10:00:00Z",
    completedTasksCount: 0,
    totalTasksCount: 3,
    updatedAt: "2026-08-01T10:00:00Z",
    version: 1,
  },
];

export interface ProjectsScreenProps {
  readonly initialProjects?: readonly Project[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly onCreateProject?: (data: ProjectFormData) => Promise<void> | void;
  readonly onUpdateProject?: (id: string, data: ProjectFormData) => Promise<void> | void;
  readonly onArchiveProject?: (id: string) => Promise<void> | void;
  readonly onRestoreProject?: (id: string) => Promise<void> | void;
  readonly onDeleteProject?: (id: string) => Promise<void> | void;
  readonly onSelectProject?: (project: Project) => void;
  readonly now?: Date;
  readonly timeZone?: string;
  readonly locale?: string;
}

const TABS: readonly TabItem[] = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "ON_HOLD", label: "On Hold" },
  { id: "COMPLETED", label: "Completed" },
  { id: "ARCHIVED", label: "Archived" },
];

const SORT_OPTIONS: readonly SortOption[] = [
  { id: "name", label: "Name" },
  { id: "deadline", label: "Deadline" },
  { id: "priority", label: "Priority" },
  { id: "updated", label: "Last updated" },
];

export function ProjectsScreen({
  initialProjects = MOCK_DEFAULT_PROJECTS,
  loading = false,
  error = null,
  onRetry,
  onCreateProject,
  onUpdateProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onSelectProject,
  now = new Date("2026-08-20T17:00:00Z"),
  timeZone = "UTC",
  locale = "en-US",
}: ProjectsScreenProps) {
  const [projects, setProjects] = useState<readonly Project[]>(initialProjects);
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [sortState, setSortState] = useState<{ optionId: string; direction: "asc" | "desc" }>({
    optionId: "name",
    direction: "asc",
  });
  const [viewMode, setViewMode] = useState<"list" | "grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  // Form Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Confirm Dialog state
  const [confirmDialogState, setConfirmDialogState] = useState<{
    open: boolean;
    type: "archive" | "delete";
    project: Project | null;
  }>({ open: false, type: "archive", project: null });

  // Selected Detail Panel state
  const [selectedDetailProject, setSelectedDetailProject] = useState<Project | null>(null);

  // Compute summary metrics across non-archived projects
  const counts = useMemo(() => {
    const activeList = projects.filter((p) => !p.archivedAt);
    const total = activeList.length;
    const active = activeList.filter((p) => p.status === "ACTIVE").length;
    const completed = activeList.filter((p) => p.status === "COMPLETED").length;
    const onHold = activeList.filter((p) => p.status === "ON_HOLD").length;
    const atRisk = activeList.filter(
      (p) => p.health === "AT_RISK" || p.health === "OFF_TRACK",
    ).length;

    let totalPercentSum = 0;
    activeList.forEach((p) => {
      if (p.totalTasksCount > 0) {
        totalPercentSum += (p.completedTasksCount / p.totalTasksCount) * 100;
      }
    });
    const averageProgress = total > 0 ? Math.round(totalPercentSum / total) : 0;

    return { total, active, completed, onHold, atRisk, averageProgress };
  }, [projects]);

  // Filter & sort projects list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Tab filter
      if (statusTab === "ARCHIVED") {
        if (!p.archivedAt) return false;
      } else {
        if (p.archivedAt) return false;
        if (statusTab !== "ALL" && p.status !== statusTab) return false;
      }

      // Priority filter
      if (priorityFilter !== "ALL" && p.priority !== priorityFilter) return false;

      // Health filter
      if (healthFilter !== "ALL" && p.health !== healthFilter) return false;

      // Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [projects, statusTab, priorityFilter, healthFilter, searchQuery]);

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    const { optionId, direction } = sortState;
    const mult = direction === "asc" ? 1 : -1;

    switch (optionId) {
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name) * mult);
      case "deadline":
        return list.sort(
          (a, b) => (a.deadlineDate ?? "9999").localeCompare(b.deadlineDate ?? "9999") * mult,
        );
      case "priority":
        return list.sort((a, b) => a.priority.localeCompare(b.priority) * mult);
      case "updated":
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) * mult);
      default:
        return list;
    }
  }, [filteredProjects, sortState]);

  // Pagination (6 items per page)
  const pageSize = 6;
  const totalPages = Math.ceil(sortedProjects.length / pageSize) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, currentPage, pageSize]);

  // Handlers
  function handleOpenCreate() {
    setEditingProject(null);
    setFormMode("create");
    setFormOpen(true);
  }

  function handleOpenEdit(project: Project) {
    setEditingProject(project);
    setFormMode("edit");
    setFormOpen(true);
  }

  async function handleFormSubmit(data: ProjectFormData) {
    if (formMode === "create") {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        health: data.health,
        color: data.color,
        icon: data.icon,
        startDate: data.startDate,
        deadlineDate: data.deadlineDate,
        completedTasksCount: 0,
        totalTasksCount: 0,
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      setProjects((prev) => [newProj, ...prev]);
      await onCreateProject?.(data);
    } else if (editingProject) {
      const updatedProj: Project = {
        ...editingProject,
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        health: data.health,
        color: data.color,
        icon: data.icon,
        startDate: data.startDate,
        deadlineDate: data.deadlineDate,
        updatedAt: new Date().toISOString(),
        version: (editingProject.version ?? 1) + 1,
      };
      setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? updatedProj : p)));
      await onUpdateProject?.(editingProject.id, data);
    }
    setFormOpen(false);
  }

  function handleArchiveClick(project: Project) {
    setConfirmDialogState({ open: true, type: "archive", project });
  }

  function handleDeleteClick(project: Project) {
    setConfirmDialogState({ open: true, type: "delete", project });
  }

  async function handleConfirmDialogAction() {
    const { type, project } = confirmDialogState;
    if (!project) return;

    if (type === "archive") {
      const archived: Project = {
        ...project,
        archivedAt: new Date().toISOString(),
      };
      setProjects((prev) => prev.map((p) => (p.id === project.id ? archived : p)));
      await onArchiveProject?.(project.id);
    } else if (type === "delete") {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      await onDeleteProject?.(project.id);
    }
    setConfirmDialogState({ open: false, type: "archive", project: null });
  }

  async function handleRestoreClick(project: Project) {
    const restored: Project = {
      ...project,
      archivedAt: null,
    };
    setProjects((prev) => prev.map((p) => (p.id === project.id ? restored : p)));
    await onRestoreProject?.(project.id);
  }

  function handleSelectMetricFilter(filter: ProjectFilterCategory) {
    if (filter === "ALL") setStatusTab("ALL");
    else if (filter === "ACTIVE") setStatusTab("ACTIVE");
    else if (filter === "COMPLETED") setStatusTab("COMPLETED");
    else if (filter === "ON_HOLD") setStatusTab("ON_HOLD");
    else if (filter === "AT_RISK") {
      setStatusTab("ALL");
      setHealthFilter("AT_RISK");
    }
  }

  return (
    <div className="lifeos-projects-screen">
      <PageHeader
        title="Projects"
        description="Track and manage project goals, progress, milestones, and health."
        breadcrumbs={[
          { label: "Today", href: "/life-os/app/today" },
          { label: "Projects", href: "/life-os/app/projects" },
        ]}
        primaryAction={
          <Button onClick={handleOpenCreate}>
            <Plus aria-hidden="true" size={16} /> Add project
          </Button>
        }
      />

      <ProjectSummaryMetrics
        counts={counts}
        loading={loading}
        error={error}
        onRetry={onRetry}
        activeFilter={statusTab as ProjectFilterCategory}
        onSelectFilter={handleSelectMetricFilter}
      />

      <div className="lifeos-projects-screen__controls">
        <Tabs
          items={TABS}
          selectedId={statusTab}
          onSelectedIdChange={(id) => {
            setStatusTab(id);
            setCurrentPage(1);
          }}
        />

        <div className="lifeos-projects-screen__toolbar">
          <div className="lifeos-projects-screen__search">
            <TextInput
              label="Search projects"
              labelHidden
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              prefix={<Search size={16} />}
            />
          </div>

          <div className="lifeos-projects-screen__filters">
            <Select
              label="Priority filter"
              labelHidden
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All priorities" },
                { value: "P1", label: "P1 - Critical" },
                { value: "P2", label: "P2 - High" },
                { value: "P3", label: "P3 - Medium" },
                { value: "P4", label: "P4 - Low" },
              ]}
            />

            <Select
              label="Health filter"
              labelHidden
              value={healthFilter}
              onChange={(e) => {
                setHealthFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All health" },
                { value: "ON_TRACK", label: "On Track" },
                { value: "AT_RISK", label: "At Risk" },
                { value: "OFF_TRACK", label: "Off Track" },
              ]}
            />

            <SortControl options={SORT_OPTIONS} value={sortState} onChange={setSortState} />

            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="lifeos-projects-screen__loading" data-testid="projects-loading">
          <Skeleton shape="card" count={3} height="120px" />
        </div>
      ) : error ? (
        <ErrorState title="Failed to load projects" description={error} onRetry={onRetry} />
      ) : paginatedProjects.length === 0 ? (
        <EmptyState
          variant={
            statusTab === "ARCHIVED"
              ? "archived"
              : searchQuery
                ? "search"
                : priorityFilter !== "ALL" || healthFilter !== "ALL"
                  ? "filtered"
                  : "first-use"
          }
          title={
            statusTab === "ARCHIVED"
              ? "No archived projects"
              : searchQuery || priorityFilter !== "ALL" || healthFilter !== "ALL"
                ? "No matching projects"
                : "No projects created yet"
          }
          description={
            statusTab === "ARCHIVED"
              ? "Archived projects will appear here once archived."
              : searchQuery || priorityFilter !== "ALL" || healthFilter !== "ALL"
                ? "Try clearing or adjusting your search filters."
                : "Create your first project to organize tasks and milestones."
          }
          primaryAction={
            searchQuery || priorityFilter !== "ALL" || healthFilter !== "ALL" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("ALL");
                  setHealthFilter("ALL");
                  setStatusTab("ALL");
                }}
              >
                Clear filters
              </Button>
            ) : statusTab !== "ARCHIVED" ? (
              <Button onClick={handleOpenCreate}>Create project</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="lifeos-projects-screen__content">
          {viewMode === "grid" ? (
            <div className="lifeos-projects-screen__grid">
              {paginatedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  now={now}
                  timeZone={timeZone}
                  locale={locale}
                  onEdit={() => handleOpenEdit(project)}
                  onArchive={() => handleArchiveClick(project)}
                  onRestore={() => handleRestoreClick(project)}
                  onDelete={() => handleDeleteClick(project)}
                />
              ))}
            </div>
          ) : (
            <div className="lifeos-projects-screen__list">
              {paginatedProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  now={now}
                  timeZone={timeZone}
                  locale={locale}
                  onEdit={() => handleOpenEdit(project)}
                  onArchive={() => handleArchiveClick(project)}
                  onRestore={() => handleRestoreClick(project)}
                  onDelete={() => handleDeleteClick(project)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="lifeos-projects-screen__pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Project Form Dialog */}
      <ProjectForm
        open={formOpen}
        mode={formMode}
        initialValues={
          editingProject
            ? {
                id: editingProject.id,
                name: editingProject.name,
                description: editingProject.description,
                status: editingProject.status,
                priority: editingProject.priority,
                health: editingProject.health,
                color: editingProject.color as any,
                icon: editingProject.icon as any,
                startDate: editingProject.startDate,
                deadlineDate: editingProject.deadlineDate,
                version: editingProject.version,
              }
            : null
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Confirmation Dialog for Archive / Delete */}
      <ConfirmDialog
        open={confirmDialogState.open}
        onClose={() => setConfirmDialogState({ open: false, type: "archive", project: null })}
        onConfirm={handleConfirmDialogAction}
        title={
          confirmDialogState.type === "archive"
            ? `Archive "${confirmDialogState.project?.name}"?`
            : `Delete "${confirmDialogState.project?.name}"?`
        }
        description={
          confirmDialogState.type === "archive"
            ? "Archiving hides this project from active views. Tasks and milestones remain intact."
            : "This action is permanent and cannot be undone. All linked milestones and data will be removed."
        }
        confirmLabel={confirmDialogState.type === "archive" ? "Archive project" : "Delete project"}
      />

      {/* Detail Panel */}
      <DetailPanel
        open={Boolean(selectedDetailProject)}
        onClose={() => setSelectedDetailProject(null)}
        title={selectedDetailProject?.name ?? "Project details"}
      >
        {selectedDetailProject ? (
          <div className="lifeos-projects-detail-preview">
            <Text>{selectedDetailProject.description || "No description provided."}</Text>
            <div className="lifeos-projects-detail-preview__meta">
              <Text size="sm">Status: {selectedDetailProject.status}</Text>
              <Text size="sm">Priority: {selectedDetailProject.priority}</Text>
              <Text size="sm">Health: {selectedDetailProject.health}</Text>
              <Text size="sm">
                Progress: {selectedDetailProject.completedTasksCount} /{" "}
                {selectedDetailProject.totalTasksCount} tasks
              </Text>
            </div>
          </div>
        ) : null}
      </DetailPanel>
    </div>
  );
}
