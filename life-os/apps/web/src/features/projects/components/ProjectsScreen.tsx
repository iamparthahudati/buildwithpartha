import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
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
import type { Project } from "../model/project";
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
  readonly projects?: readonly Project[];
  readonly summaryCounts?: {
    readonly total: number;
    readonly active: number;
    readonly completed: number;
    readonly onHold: number;
    readonly atRisk: number;
    readonly averageProgress: number;
  };
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly statusTab?: string;
  readonly searchQuery?: string;
  readonly priorityFilter?: string;
  readonly healthFilter?: string;
  readonly sortState?: { optionId: string; direction: "asc" | "desc" };
  readonly viewMode?: "list" | "grid" | "table";
  readonly currentPage?: number;
  readonly totalPages?: number;
  readonly totalItems?: number;
  readonly pageSize?: number;
  readonly selectedProject?: Project | null;
  readonly onStatusTabChange?: (tab: string) => void;
  readonly onSearchQueryChange?: (query: string) => void;
  readonly onPriorityFilterChange?: (priority: string) => void;
  readonly onHealthFilterChange?: (health: string) => void;
  readonly onSortChange?: (sort: { optionId: string; direction: "asc" | "desc" }) => void;
  readonly onViewModeChange?: (mode: "list" | "grid" | "table") => void;
  readonly onPageChange?: (page: number) => void;
  readonly onSelectProject?: (project: Project | null) => void;
  readonly onRetry?: () => void;
  readonly onCreateProject?: (data: ProjectFormData) => Promise<void> | void;
  readonly onUpdateProject?: (id: string, data: ProjectFormData) => Promise<void> | void;
  readonly onArchiveProject?: (id: string) => Promise<void> | void;
  readonly onRestoreProject?: (id: string) => Promise<void> | void;
  readonly onDeleteProject?: (id: string) => Promise<void> | void;
  readonly now?: Date;
  readonly timeZone?: string;
  readonly locale?: string;
}

const TABS: readonly TabItem[] = [
  { id: "ALL", label: "All", panel: null },
  { id: "ACTIVE", label: "Active", panel: null },
  { id: "ON_HOLD", label: "On Hold", panel: null },
  { id: "COMPLETED", label: "Completed", panel: null },
  { id: "ARCHIVED", label: "Archived", panel: null },
];

const SORT_OPTIONS: readonly SortOption[] = [
  { id: "name", label: "Name" },
  { id: "deadline", label: "Deadline" },
  { id: "priority", label: "Priority" },
  { id: "updated", label: "Last updated" },
];

export function ProjectsScreen({
  initialProjects = MOCK_DEFAULT_PROJECTS,
  projects: controlledProjects,
  summaryCounts: controlledCounts,
  loading = false,
  error = null,
  statusTab: controlledStatusTab,
  searchQuery: controlledSearchQuery,
  priorityFilter: controlledPriorityFilter,
  healthFilter: controlledHealthFilter,
  sortState: controlledSortState,
  viewMode: controlledViewMode,
  currentPage: controlledCurrentPage,
  totalPages: controlledTotalPages,
  totalItems: controlledTotalItems,
  pageSize = 6,
  selectedProject: controlledSelectedProject,
  onStatusTabChange,
  onSearchQueryChange,
  onPriorityFilterChange,
  onHealthFilterChange,
  onSortChange,
  onViewModeChange,
  onPageChange,
  onSelectProject,
  onRetry,
  onCreateProject,
  onUpdateProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  now = new Date("2026-08-20T17:00:00Z"),
  timeZone = "UTC",
  locale = "en-US",
}: ProjectsScreenProps) {
  const [internalProjects, setInternalProjects] = useState<readonly Project[]>(initialProjects);
  const [internalStatusTab, setInternalStatusTab] = useState<string>("ALL");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalPriorityFilter, setInternalPriorityFilter] = useState<string>("ALL");
  const [internalHealthFilter, setInternalHealthFilter] = useState<string>("ALL");
  const [internalSortState, setInternalSortState] = useState<{
    optionId: string;
    direction: "asc" | "desc";
  }>({
    optionId: "name",
    direction: "asc",
  });
  const [internalViewMode, setInternalViewMode] = useState<"list" | "grid" | "table">("grid");
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalSelectedProject, setInternalSelectedProject] = useState<Project | null>(null);

  const isControlled = controlledProjects !== undefined;

  const projects = controlledProjects ?? internalProjects;
  const statusTab = controlledStatusTab ?? internalStatusTab;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const priorityFilter = controlledPriorityFilter ?? internalPriorityFilter;
  const healthFilter = controlledHealthFilter ?? internalHealthFilter;
  const sortState = controlledSortState ?? internalSortState;
  const viewMode = controlledViewMode ?? internalViewMode;
  const currentPage = controlledCurrentPage ?? internalCurrentPage;
  const selectedDetailProject =
    controlledSelectedProject !== undefined ? controlledSelectedProject : internalSelectedProject;

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

  // Compute summary metrics across non-archived projects if not controlled
  const computedCounts = useMemo(() => {
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

  const counts = controlledCounts ?? computedCounts;

  // Filter & sort projects list when in uncontrolled mode
  const filteredProjects = useMemo(() => {
    if (isControlled) return projects;
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
  }, [isControlled, projects, statusTab, priorityFilter, healthFilter, searchQuery]);

  const sortedProjects = useMemo(() => {
    if (isControlled) return filteredProjects;
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
  }, [isControlled, filteredProjects, sortState]);

  // Pagination
  const computedTotalPages = isControlled
    ? (controlledTotalPages ?? Math.ceil((controlledTotalItems ?? projects.length) / pageSize)) || 1
    : Math.ceil(sortedProjects.length / pageSize) || 1;

  const totalPages = computedTotalPages;
  const totalItemsCount = controlledTotalItems ?? sortedProjects.length;

  const paginatedProjects = useMemo(() => {
    if (isControlled) return projects;
    const start = (currentPage - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [isControlled, projects, sortedProjects, currentPage, pageSize]);

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
        description: data.description ?? null,
        status: data.status,
        priority: data.priority,
        health: data.health,
        color: data.color ?? null,
        icon: data.icon ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        startDate: data.startDate ?? null,
        deadlineDate: data.deadlineDate ?? null,
        completedTasksCount: 0,
        totalTasksCount: 0,
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      setInternalProjects((prev) => [newProj, ...prev]);
      await onCreateProject?.(data);
    } else if (editingProject) {
      const updatedProj: Project = {
        ...editingProject,
        name: data.name,
        description: data.description ?? null,
        status: data.status,
        priority: data.priority,
        health: data.health,
        color: data.color ?? null,
        icon: data.icon ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        startDate: data.startDate ?? null,
        deadlineDate: data.deadlineDate ?? null,
        updatedAt: new Date().toISOString(),
        version: (editingProject.version ?? 1) + 1,
      };
      setInternalProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? updatedProj : p)),
      );
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
      setInternalProjects((prev) => prev.map((p) => (p.id === project.id ? archived : p)));
      await onArchiveProject?.(project.id);
    } else if (type === "delete") {
      setInternalProjects((prev) => prev.filter((p) => p.id !== project.id));
      await onDeleteProject?.(project.id);
    }
    setConfirmDialogState({ open: false, type: "archive", project: null });
  }

  async function handleRestoreClick(project: Project) {
    const restored: Project = {
      ...project,
      archivedAt: null,
    };
    setInternalProjects((prev) => prev.map((p) => (p.id === project.id ? restored : p)));
    await onRestoreProject?.(project.id);
  }

  function handleSelectMetricFilter(filter: ProjectFilterCategory) {
    if (filter === "ALL") {
      setInternalStatusTab("ALL");
      onStatusTabChange?.("ALL");
    } else if (filter === "ACTIVE") {
      setInternalStatusTab("ACTIVE");
      onStatusTabChange?.("ACTIVE");
    } else if (filter === "COMPLETED") {
      setInternalStatusTab("COMPLETED");
      onStatusTabChange?.("COMPLETED");
    } else if (filter === "ON_HOLD") {
      setInternalStatusTab("ON_HOLD");
      onStatusTabChange?.("ON_HOLD");
    } else if (filter === "AT_RISK") {
      setInternalStatusTab("ALL");
      setInternalHealthFilter("AT_RISK");
      onStatusTabChange?.("ALL");
      onHealthFilterChange?.("AT_RISK");
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
        {...(error ? { error } : {})}
        {...(onRetry ? { onRetry } : {})}
        activeFilter={statusTab as ProjectFilterCategory}
        onSelectFilter={handleSelectMetricFilter}
      />

      <div className="lifeos-projects-screen__controls">
        <Tabs
          label="Project status views"
          items={TABS}
          selectedId={statusTab}
          onSelectedIdChange={(id) => {
            setInternalStatusTab(id);
            setInternalCurrentPage(1);
            onStatusTabChange?.(id);
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
                const val = e.target.value;
                setInternalSearchQuery(val);
                setInternalCurrentPage(1);
                onSearchQueryChange?.(val);
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
                const val = e.target.value;
                setInternalPriorityFilter(val);
                setInternalCurrentPage(1);
                onPriorityFilterChange?.(val);
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
                const val = e.target.value;
                setInternalHealthFilter(val);
                setInternalCurrentPage(1);
                onHealthFilterChange?.(val);
              }}
              options={[
                { value: "ALL", label: "All health" },
                { value: "ON_TRACK", label: "On Track" },
                { value: "AT_RISK", label: "At Risk" },
                { value: "OFF_TRACK", label: "Off Track" },
              ]}
            />

            <SortControl
              options={SORT_OPTIONS}
              value={sortState}
              onChange={(sort) => {
                setInternalSortState(sort);
                onSortChange?.(sort);
              }}
            />

            <ViewToggle
              value={viewMode}
              onChange={(mode) => {
                setInternalViewMode(mode);
                onViewModeChange?.(mode);
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="lifeos-projects-screen__loading" data-testid="projects-loading">
          <Skeleton shape="block" height="120px" />
          <Skeleton shape="block" height="120px" />
          <Skeleton shape="block" height="120px" />
        </div>
      ) : error ? (
        <ErrorState
          scope="page"
          title="Failed to load projects"
          description={error}
          {...(onRetry ? { onRetry } : {})}
        />
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
                  setInternalSearchQuery("");
                  setInternalPriorityFilter("ALL");
                  setInternalHealthFilter("ALL");
                  setInternalStatusTab("ALL");
                  setInternalCurrentPage(1);
                  onSearchQueryChange?.("");
                  onPriorityFilterChange?.("ALL");
                  onHealthFilterChange?.("ALL");
                  onStatusTabChange?.("ALL");
                  onPageChange?.(1);
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
                page={currentPage}
                pageSize={pageSize}
                total={totalItemsCount}
                onPageChange={(p) => {
                  setInternalCurrentPage(p);
                  onPageChange?.(p);
                }}
                label="Projects pagination"
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
                description: editingProject.description ?? "",
                status: editingProject.status,
                priority: editingProject.priority,
                health: editingProject.health,
                color: editingProject.color as any,
                icon: editingProject.icon as any,
                coverImageUrl: editingProject.coverImageUrl ?? null,
                startDate: editingProject.startDate ?? null,
                deadlineDate: editingProject.deadlineDate ?? null,
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
        onClose={() => {
          setInternalSelectedProject(null);
          onSelectProject?.(null);
        }}
        title={selectedDetailProject?.name ?? "Project details"}
        content={
          selectedDetailProject ? (
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
          ) : null
        }
      />
    </div>
  );
}
