import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ProjectsScreen,
  useProjects,
  useCreateProject,
  useUpdateProject,
  useArchiveProject,
  useRestoreProject,
  useDeleteProject,
  type ProjectFormData,
  type ProjectQueryParams,
  type Project,
} from "@features/projects";
import { useAuthSession } from "@state/authSession";

const SORT_FIELD_MAP: Record<string, string> = {
  name: "name",
  deadline: "deadlineDate",
  priority: "priority",
  updated: "updatedAt",
};

export function ProjectsRoute() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const statusTab = searchParams.get("status") ?? "ALL";
  const searchQuery = searchParams.get("q") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "ALL";
  const healthFilter = searchParams.get("health") ?? "ALL";
  const sortOptionId = searchParams.get("sort") ?? "name";
  const sortDirection = (searchParams.get("dir") === "desc" ? "desc" : "asc") as "asc" | "desc";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const viewMode = (searchParams.get("view") ?? "grid") as "list" | "grid" | "table";
  const selectedProjectId = searchParams.get("selected") ?? null;

  // Build API Query params
  const apiQueryParams: ProjectQueryParams = useMemo(() => {
    const isArchivedTab = statusTab === "ARCHIVED";
    const statusArray = statusTab !== "ALL" && !isArchivedTab ? [statusTab] : undefined;
    const priorityArray = priorityFilter !== "ALL" ? [priorityFilter] : undefined;
    const healthArray = healthFilter !== "ALL" ? [healthFilter] : undefined;
    const sortBy = SORT_FIELD_MAP[sortOptionId] ?? "name";

    return {
      ...(searchQuery ? { q: searchQuery } : {}),
      ...(statusArray ? { status: statusArray } : {}),
      ...(priorityArray ? { priority: priorityArray } : {}),
      ...(healthArray ? { health: healthArray } : {}),
      archived: isArchivedTab ? true : false,
      page: currentPage - 1,
      size: 10,
      sortBy,
      sortDirection: sortDirection.toUpperCase() as "ASC" | "DESC",
    };
  }, [
    statusTab,
    searchQuery,
    priorityFilter,
    healthFilter,
    sortOptionId,
    sortDirection,
    currentPage,
  ]);

  const projectsQuery = useProjects(apiQueryParams, user !== null);
  const { data, isPending, isError, error, refetch } = projectsQuery;

  // Mutations
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const archiveMutation = useArchiveProject();
  const restoreMutation = useRestoreProject();
  const deleteMutation = useDeleteProject();

  // Helper to update search params
  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") {
              next.delete(key);
            } else {
              next.set(key, value);
            }
          });
          return Object.fromEntries(next.entries());
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const projectsList = useMemo(() => data?.items ?? [], [data?.items]);
  const summaryCounts = data?.summary ?? undefined;
  const totalPages = data?.page?.totalPages ?? 1;
  const totalItems = data?.page?.totalItems ?? 0;

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projectsList.find((p) => p.id === selectedProjectId) ?? null;
  }, [selectedProjectId, projectsList]);

  // Handlers for URL state updates
  const handleStatusTabChange = useCallback(
    (tab: string) => {
      updateUrlParams({ status: tab === "ALL" ? null : tab, page: null });
    },
    [updateUrlParams],
  );

  const handleSearchQueryChange = useCallback(
    (q: string) => {
      updateUrlParams({ q: q ? q : null, page: null });
    },
    [updateUrlParams],
  );

  const handlePriorityFilterChange = useCallback(
    (priority: string) => {
      updateUrlParams({ priority: priority === "ALL" ? null : priority, page: null });
    },
    [updateUrlParams],
  );

  const handleHealthFilterChange = useCallback(
    (health: string) => {
      updateUrlParams({ health: health === "ALL" ? null : health, page: null });
    },
    [updateUrlParams],
  );

  const handleSortChange = useCallback(
    (sort: { optionId: string; direction: "asc" | "desc" }) => {
      updateUrlParams({
        sort: sort.optionId === "name" ? null : sort.optionId,
        dir: sort.direction === "asc" ? null : sort.direction,
      });
    },
    [updateUrlParams],
  );

  const handleViewModeChange = useCallback(
    (mode: "list" | "grid" | "table") => {
      updateUrlParams({ view: mode === "grid" ? null : mode });
    },
    [updateUrlParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateUrlParams({ page: page === 1 ? null : String(page) });
    },
    [updateUrlParams],
  );

  const handleSelectProject = useCallback(
    (project: Project | null) => {
      updateUrlParams({ selected: project ? project.id : null });
    },
    [updateUrlParams],
  );

  // Handlers for CRUD operations
  const handleCreateProject = useCallback(
    async (formData: ProjectFormData) => {
      await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description ?? null,
        status: formData.status,
        priority: formData.priority,
        health: formData.health,
        color: formData.color ?? null,
        icon: formData.icon ?? null,
        startDate: formData.startDate ?? null,
        deadlineDate: formData.deadlineDate ?? null,
      });
    },
    [createMutation],
  );

  const handleUpdateProject = useCallback(
    async (id: string, formData: ProjectFormData) => {
      const existing = projectsList.find((p) => p.id === id);
      await updateMutation.mutateAsync({
        id,
        request: {
          name: formData.name,
          description: formData.description ?? null,
          status: formData.status,
          priority: formData.priority,
          health: formData.health,
          color: formData.color ?? null,
          icon: formData.icon ?? null,
          startDate: formData.startDate ?? null,
          deadlineDate: formData.deadlineDate ?? null,
          version: existing?.version ?? formData.version ?? 1,
        },
      });
    },
    [projectsList, updateMutation],
  );

  const handleArchiveProject = useCallback(
    async (id: string) => {
      const existing = projectsList.find((p) => p.id === id);
      await archiveMutation.mutateAsync({
        id,
        request: {
          version: existing?.version ?? 1,
        },
      });
    },
    [projectsList, archiveMutation],
  );

  const handleRestoreProject = useCallback(
    async (id: string) => {
      const existing = projectsList.find((p) => p.id === id);
      await restoreMutation.mutateAsync({
        id,
        request: {
          version: existing?.version ?? 1,
        },
      });
    },
    [projectsList, restoreMutation],
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  if (user === null) {
    return null;
  }

  return (
    <ProjectsScreen
      projects={projectsList}
      {...(summaryCounts ? { summaryCounts } : {})}
      loading={isPending}
      error={isError ? (error?.message ?? "Failed to load projects from server.") : null}
      statusTab={statusTab}
      searchQuery={searchQuery}
      priorityFilter={priorityFilter}
      healthFilter={healthFilter}
      sortState={{ optionId: sortOptionId, direction: sortDirection }}
      viewMode={viewMode}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      {...(selectedProject ? { selectedProject } : {})}
      onStatusTabChange={handleStatusTabChange}
      onSearchQueryChange={handleSearchQueryChange}
      onPriorityFilterChange={handlePriorityFilterChange}
      onHealthFilterChange={handleHealthFilterChange}
      onSortChange={handleSortChange}
      onViewModeChange={handleViewModeChange}
      onPageChange={handlePageChange}
      onSelectProject={handleSelectProject}
      onRetry={() => void refetch()}
      onCreateProject={handleCreateProject}
      onUpdateProject={handleUpdateProject}
      onArchiveProject={handleArchiveProject}
      onRestoreProject={handleRestoreProject}
      onDeleteProject={handleDeleteProject}
      timeZone={user.timeZone}
      locale={user.locale}
    />
  );
}
