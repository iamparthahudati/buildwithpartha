import type { Page, Route } from "@playwright/test";

export interface MockStateOptions {
  user?: {
    id: string;
    email: string;
    displayName: string;
    timeZone: string;
    locale: string;
    weekStart?: number;
    onboardingCompleted: boolean;
  } | null;
  todayDate?: string;
  initialProjects?: Array<Record<string, unknown>>;
  initialTasks?: Array<Record<string, unknown>>;
  initialTimeBlocks?: Array<Record<string, unknown>>;
  initialBrainDump?: Array<Record<string, unknown>>;
  initialHabits?: Array<Record<string, unknown>>;
  initialReviews?: Array<Record<string, unknown>>;
  initialWeeklyPlans?: Array<Record<string, unknown>>;
  initialNotes?: Array<Record<string, unknown>>;
  initialGoals?: Array<Record<string, unknown>>;
}

export class MockBackendState {
  user: {
    id: string;
    email: string;
    displayName: string;
    timeZone: string;
    locale: string;
    weekStart: number;
    onboardingCompleted: boolean;
    deletionGracePeriodExpiresAt?: string | null;
  } | null;

  todayDate: string;
  projects: Array<any>;
  tasks: Array<any>;
  subtasks: Map<string, Array<any>>;
  timeBlocks: Array<any>;
  focusSession: any | null;
  mitTaskId: string | null;
  brainDump: Array<any>;
  notes: Array<any>;
  habits: Array<any>;
  habitEntries: Map<string, Array<any>>;
  sprints: Array<any>;
  weeklyPlans: Array<any>;
  reviews: Array<any>;
  recurringSeries: Array<any>;
  sessions: Array<any>;
  exportRequests: Array<any>;
  notifications: Array<any>;

  constructor(options: MockStateOptions = {}) {
    this.user =
      options.user !== undefined
        ? options.user
          ? {
              ...options.user,
              weekStart: options.user.weekStart ?? 1,
            }
          : null
        : {
            id: "user-e2e-1234",
            email: "e2e-user@example.test",
            displayName: "E2E Test User",
            timeZone: "UTC",
            locale: "en-US",
            weekStart: 1,
            onboardingCompleted: true,
          };

    this.todayDate = options.todayDate ?? new Date().toISOString().slice(0, 10);
    this.projects = options.initialProjects ?? [];
    this.tasks = options.initialTasks ?? [];
    this.subtasks = new Map();
    this.timeBlocks = options.initialTimeBlocks ?? [];
    this.focusSession = null;
    this.mitTaskId = null;
    this.brainDump = options.initialBrainDump ?? [];
    this.notes = options.initialNotes ?? [];
    this.habits = options.initialHabits ?? [];
    this.habitEntries = new Map();
    this.sprints = [];
    this.weeklyPlans = options.initialWeeklyPlans ?? [];
    this.reviews = options.initialReviews ?? [];
    this.recurringSeries = [];
    this.sessions = [
      {
        id: "sess-1",
        deviceHint: "Playwright Headless Chrome",
        isCurrent: true,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        id: "sess-2",
        deviceHint: "Mobile Safari iOS",
        isCurrent: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    this.exportRequests = [];
    this.notifications = [
      {
        id: "notif-1",
        category: "SYSTEM",
        title: "Welcome to LifeOS",
        body: "Your private operating system is ready.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async setupRouteHandlers(page: Page) {
    await page.route("**/life-os/api/v1/**", async (route: Route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());
      const pathname = url.pathname.replace(/^\/life-os\/api\/v1/, "");

      // Public / Auth routes
      if (pathname === "/auth/signup" && method === "POST") {
        const body = request.postDataJSON() || {};
        this.user = {
          id: "user-" + Date.now(),
          email: body.email,
          displayName: body.displayName,
          timeZone: "UTC",
          locale: "en-US",
          weekStart: 1,
          onboardingCompleted: false,
        };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            status: "PENDING_VERIFICATION",
          }),
        });
      }

      if (pathname === "/auth/verify-email" && method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "VERIFIED" }),
        });
      }

      if (pathname === "/auth/login" && method === "POST") {
        const body = request.postDataJSON() || {};
        if (!this.user) {
          this.user = {
            id: "user-" + Date.now(),
            email: body.email,
            displayName: "Test User",
            timeZone: "UTC",
            locale: "en-US",
            weekStart: 1,
            onboardingCompleted: true,
          };
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: this.user.id,
            email: this.user.email,
            displayName: this.user.displayName,
            timeZone: this.user.timeZone,
            locale: this.user.locale,
            weekStart: this.user.weekStart,
            csrfToken: "mock-csrf-token-xyz-12345",
          }),
        });
      }

      if (pathname === "/auth/session" && method === "GET") {
        if (!this.user) {
          return route.fulfill({
            status: 401,
            contentType: "application/problem+json",
            body: JSON.stringify({ title: "Unauthorized", status: 401 }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: this.user.id,
            email: this.user.email,
            displayName: this.user.displayName,
            timeZone: this.user.timeZone,
            locale: this.user.locale,
            weekStart: this.user.weekStart,
            csrfToken: "mock-csrf-token-xyz-12345",
          }),
        });
      }

      if (pathname === "/auth/sessions" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sessions: this.sessions }),
        });
      }

      if (pathname.startsWith("/auth/sessions/") && method === "DELETE") {
        const id = pathname.replace("/auth/sessions/", "");
        this.sessions = this.sessions.filter((s) => s.id !== id);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ revoked: true }),
        });
      }

      if (pathname === "/auth/logout" && method === "POST") {
        this.user = null;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "LOGGED_OUT" }),
        });
      }

      // Onboarding routes
      if (pathname === "/onboarding/state" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            currentStep: this.user?.onboardingCompleted ? 4 : 1,
            completedSteps: this.user?.onboardingCompleted ? [1, 2, 3] : [],
            timeZone: this.user?.timeZone ?? "UTC",
            locale: this.user?.locale ?? "en-US",
          }),
        });
      }

      if (pathname === "/onboarding/time" && method === "PUT") {
        const body = request.postDataJSON() || {};
        if (this.user) {
          this.user.timeZone = body.timeZone || this.user.timeZone;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, currentStep: 2 }),
        });
      }

      if (pathname === "/onboarding/planning" && method === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, currentStep: 3 }),
        });
      }

      if (pathname === "/onboarding/complete" && method === "POST") {
        if (this.user) {
          this.user.onboardingCompleted = true;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, onboardingCompleted: true }),
        });
      }

      // User Profile and Preferences
      if (pathname === "/user/profile" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            displayName: this.user?.displayName,
            email: this.user?.email,
          }),
        });
      }

      if (pathname === "/user/preferences" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            userId: this.user?.id ?? "user-1",
            onboardingVersion: 1,
            onboardingStatus: "COMPLETED",
            lastCompletedStep: "FINALIZE",
            onboardingCompletedAt: new Date().toISOString(),
            planningDefaults: {
              workingDays: [1, 2, 3, 4, 5],
              workStartTime: "09:00",
              workEndTime: "17:00",
              overnightSchedule: false,
              dailyFocusTargetMinutes: 240,
              focusDurationMinutes: 25,
              breakDurationMinutes: 5,
              longBreakDurationMinutes: 15,
              focusSessionsBeforeLongBreak: 4,
              autoStartBreaks: false,
              autoStartFocusSessions: false,
              soundEnabled: true,
              browserNotificationsEnabled: false,
            },
          }),
        });
      }

      if (pathname === "/user/change-password" && method === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "PASSWORD_CHANGED" }),
        });
      }

      if (pathname === "/user/export-requests" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ requests: this.exportRequests }),
        });
      }

      if (pathname === "/user/export-requests" && method === "POST") {
        const newReq = {
          id: "exp-" + Date.now(),
          status: "READY",
          downloadToken: "tok-e2e-dl-9876",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        this.exportRequests.push(newReq);
        return route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify(newReq),
        });
      }

      if (pathname === "/user/account-deletion" && method === "POST") {
        if (this.user) {
          this.user.deletionGracePeriodExpiresAt = new Date(
            Date.now() + 30 * 86400000,
          ).toISOString();
        }
        return route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({
            status: "PENDING_DELETION",
            gracePeriodExpiresAt: this.user?.deletionGracePeriodExpiresAt,
          }),
        });
      }

      if (pathname === "/user/cancel-account-deletion" && method === "POST") {
        if (this.user) {
          this.user.deletionGracePeriodExpiresAt = null;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "ACTIVE" }),
        });
      }

      // Today Dashboard Aggregation
      if (pathname === "/today" && method === "GET") {
        const mitTask = this.tasks.find((t) => t.id === this.mitTaskId && t.status !== "DONE");
        const todayTasks = this.tasks.filter((t) => t.status !== "ARCHIVED");
        const overdueTasks = this.tasks.filter(
          (t) => t.dueAt && t.dueAt < this.todayDate && t.status !== "DONE",
        );
        const activeProjects = this.projects.filter((p) => p.status === "ACTIVE");

        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            generatedAt: new Date().toISOString(),
            userTimeZone: this.user?.timeZone ?? "UTC",
            localDate: this.todayDate,
            mit: {
              status: mitTask ? "SUCCESS" : "EMPTY",
              data: mitTask
                ? {
                    taskId: mitTask.id,
                    title: mitTask.title,
                    priority: mitTask.priority ?? "MEDIUM",
                    dueDate: mitTask.dueAt ?? null,
                    completed: mitTask.status === "DONE",
                    focusActive: false,
                    projectId: mitTask.projectId ?? null,
                    projectName: null,
                    projectColor: null,
                  }
                : null,
              error: null,
            },
            currentNextBlock: {
              status: "EMPTY",
              data: {
                current: null,
                next: null,
              },
              error: null,
            },
            tasks: {
              status: "SUCCESS",
              data: {
                tasks: todayTasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority ?? "MEDIUM",
                  dueDate: t.dueAt ?? null,
                  completed: t.status === "DONE",
                  isOverdue: Boolean(t.overdue),
                  status: t.status,
                  projectId: t.projectId ?? null,
                  projectName: null,
                  projectColor: null,
                })),
              },
              error: null,
            },
            schedule: {
              status: "SUCCESS",
              data: {
                blocks: this.timeBlocks.map((b) => ({
                  id: b.id,
                  title: b.title,
                  startTime: b.startTime,
                  endTime: b.endTime,
                  category: b.category ?? "FOCUS",
                  projectId: b.projectId ?? null,
                  projectName: null,
                  completed: b.status === "COMPLETED",
                })),
                conflicts: [],
              },
              error: null,
            },
            overdue: {
              status: "SUCCESS",
              data: {
                totalCount: overdueTasks.length,
                topOverdueTasks: overdueTasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority ?? "MEDIUM",
                  dueDate: t.dueAt ?? null,
                  completed: false,
                  isOverdue: true,
                  projectId: t.projectId ?? null,
                  projectName: null,
                  projectColor: null,
                })),
              },
              error: null,
            },
            focusSummary: {
              status: "SUCCESS",
              data: {
                actualFocusMinutesToday: 0,
                plannedFocusMinutesToday: 60,
                activeSessionTimerSummary: null,
                isSessionActive: Boolean(this.focusSession),
              },
              error: null,
            },
            sprint: {
              status: "EMPTY",
              data: null,
              error: null,
            },
            week: {
              status: "EMPTY",
              data: null,
              error: null,
            },
            activeProjects: {
              status: "SUCCESS",
              data: {
                projects: activeProjects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  color: p.color ?? "#3b82f6",
                  completedTasksCount: p.completedTasksCount ?? 0,
                  totalTasksCount: p.totalTasksCount ?? 0,
                  status: p.status,
                })),
              },
              error: null,
            },
            review: {
              status: "SUCCESS",
              data: {
                morningReviewCompleted: this.reviews.some((r) => r.type === "DAILY_MORNING"),
                eveningReviewCompleted: this.reviews.some((r) => r.type === "DAILY_EVENING"),
                morningReviewState: this.reviews.some((r) => r.type === "DAILY_MORNING")
                  ? "COMPLETED"
                  : "NOT_STARTED",
                eveningReviewState: this.reviews.some((r) => r.type === "DAILY_EVENING")
                  ? "COMPLETED"
                  : "NOT_STARTED",
              },
              error: null,
            },
            brainDump: {
              status: "SUCCESS",
              data: {
                unprocessedCount: this.brainDump.filter((b) => !b.convertedToType && !b.archived)
                  .length,
              },
              error: null,
            },
            habits: {
              status: "SUCCESS",
              data: {
                habits: this.habits.map((h) => ({
                  id: h.id,
                  name: h.name,
                  cadence: h.cadence ?? "DAILY",
                  targetCount: h.targetCount ?? 1,
                  completedCount: 0,
                  localDate: this.todayDate,
                  timeZone: this.user?.timeZone ?? "UTC",
                  paused: false,
                  currentStreak: 0,
                })),
              },
              error: null,
            },
            metrics: {
              status: "SUCCESS",
              data: {
                metrics: [
                  {
                    key: "tasks",
                    label: "Tasks Completed",
                    value: String(todayTasks.filter((t) => t.status === "DONE").length),
                    unit: null,
                    trend: null,
                    status: null,
                  },
                ],
              },
              error: null,
            },
          }),
        });
      }

      // Projects
      if (pathname === "/projects" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            page: {
              items: this.projects,
              page: 0,
              size: 50,
              totalItems: this.projects.length,
              totalPages: 1,
              first: true,
              last: true,
            },
            summary: {
              total: this.projects.length,
              active: this.projects.filter((p) => p.status === "ACTIVE").length,
              completed: this.projects.filter((p) => p.status === "COMPLETED").length,
              onHold: this.projects.filter((p) => p.status === "ON_HOLD").length,
              atRisk: this.projects.filter((p) => p.health === "AT_RISK").length,
              averageProgress: 0,
            },
          }),
        });
      }

      if (pathname === "/projects" && method === "POST") {
        const body = request.postDataJSON() || {};
        const project = {
          id: "proj-" + Date.now(),
          userId: this.user?.id ?? "user-1",
          name: body.name,
          description: body.description ?? "",
          color: body.color ?? "#3b82f6",
          priority: body.priority ?? "P2",
          status: body.status ?? "ACTIVE",
          health: body.health ?? "ON_TRACK",
          icon: body.icon ?? null,
          coverImageUrl: body.coverImageUrl ?? null,
          startDate: body.startDate ?? null,
          deadlineDate: body.deadlineDate ?? null,
          estimateMinutes: body.estimateMinutes ?? null,
          labelIds: body.labelIds ?? [],
          totalTasksCount: 0,
          completedTasksCount: 0,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.projects.push(project);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(project),
        });
      }

      if (pathname.match(/^\/projects\/[^/]+$/) && method === "GET") {
        const id = pathname.replace("/projects/", "");
        const proj = this.projects.find((p) => p.id === id);
        if (!proj) {
          return route.fulfill({ status: 404, body: JSON.stringify({ status: 404 }) });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(proj),
        });
      }

      if (pathname.match(/^\/projects\/[^/]+\/detail$/) && method === "GET") {
        const id = pathname.replace("/projects/", "").replace("/detail", "");
        const proj = this.projects.find((p) => p.id === id);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            project: proj,
            milestones: [],
            openTaskCount: this.tasks.filter((t) => t.projectId === id && t.status !== "DONE")
              .length,
            completedTaskCount: this.tasks.filter((t) => t.projectId === id && t.status === "DONE")
              .length,
          }),
        });
      }

      // Tasks
      if (pathname === "/tasks" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            page: {
              items: this.tasks,
              page: 0,
              size: 50,
              totalItems: this.tasks.length,
              totalPages: 1,
              first: true,
              last: true,
            },
            summary: {
              total: this.tasks.length,
              toDo: this.tasks.filter((t) => t.status === "TODO" || t.status === "OPEN").length,
              inProgress: this.tasks.filter((t) => t.status === "IN_PROGRESS").length,
              blocked: this.tasks.filter((t) => t.status === "BLOCKED").length,
              done: this.tasks.filter((t) => t.status === "DONE").length,
              cancelled: 0,
              overdue: 0,
              mit: this.mitTaskId ? 1 : 0,
            },
          }),
        });
      }

      if (pathname === "/tasks/summary-counts" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            total: this.tasks.length,
            toDo: this.tasks.filter((t) => t.status === "TODO" || t.status === "OPEN").length,
            inProgress: this.tasks.filter((t) => t.status === "IN_PROGRESS").length,
            blocked: this.tasks.filter((t) => t.status === "BLOCKED").length,
            done: this.tasks.filter((t) => t.status === "DONE").length,
            cancelled: 0,
            overdue: 0,
            mit: this.mitTaskId ? 1 : 0,
          }),
        });
      }

      if (pathname === "/tasks" && method === "POST") {
        const body = request.postDataJSON() || {};
        const task = {
          id: "task-" + Date.now(),
          userId: this.user?.id ?? "user-1",
          title: body.title,
          description: body.description ?? "",
          priority: body.priority ?? "MEDIUM",
          status: body.status ?? "TODO",
          projectId: body.projectId ?? null,
          dueAt: body.dueAt ?? null,
          estimateMinutes: body.estimateMinutes ?? 30,
          spentMinutes: 0,
          progress: 0,
          mitDate: body.mitDate ?? null,
          overdue: false,
          archived: false,
          subtaskCount: 0,
          completedSubtaskCount: 0,
          subtasks: [],
          labelIds: body.labelIds ?? [],
          recurringSeriesId: body.recurringSeriesId ?? null,
          recurrenceOccurrenceDate: body.recurrenceOccurrenceDate ?? null,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.tasks.push(task);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      }

      if (pathname.match(/^\/tasks\/[^/]+$/) && method === "GET") {
        const id = pathname.replace("/tasks/", "");
        const task = this.tasks.find((t) => t.id === id);
        if (!task) return route.fulfill({ status: 404, body: "" });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      }

      if (pathname.match(/^\/tasks\/[^/]+\/detail$/) && method === "GET") {
        const id = pathname.replace("/tasks/", "").replace("/detail", "");
        const task = this.tasks.find((t) => t.id === id);
        if (!task) return route.fulfill({ status: 404, body: "" });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            task,
            dependencies: {
              blockers: [],
              dependents: [],
              isBlocked: false,
              unresolvedBlockerCount: 0,
            },
            counts: {
              linkedTimeBlockCount: 0,
              focusSessionCount: 0,
              commentCount: 0,
              attachmentCount: 0,
              activityEventCount: 0,
            },
            version: task.version ?? 1,
          }),
        });
      }

      if (pathname.match(/^\/tasks\/[^/]+$/) && method === "PUT") {
        const id = pathname.replace("/tasks/", "");
        const body = request.postDataJSON() || {};
        const taskIndex = this.tasks.findIndex((t) => t.id === id);
        if (taskIndex >= 0) {
          this.tasks[taskIndex] = {
            ...this.tasks[taskIndex],
            ...body,
            version: (this.tasks[taskIndex].version || 1) + 1,
            updatedAt: new Date().toISOString(),
          };
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(this.tasks[taskIndex]),
          });
        }
        return route.fulfill({ status: 404, body: "" });
      }

      if (pathname.match(/^\/tasks\/[^/]+\/complete$/) && method === "POST") {
        const id = pathname.replace("/tasks/", "").replace("/complete", "");
        const task = this.tasks.find((t) => t.id === id);
        if (task) {
          task.status = "DONE";
          task.completedAt = new Date().toISOString();
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      }

      // Subtasks
      if (pathname.match(/^\/tasks\/[^/]+\/subtasks$/) && method === "GET") {
        const taskId = pathname.replace("/tasks/", "").replace("/subtasks", "");
        const list = this.subtasks.get(taskId) ?? [];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ subtasks: list }),
        });
      }

      if (pathname.match(/^\/tasks\/[^/]+\/subtasks$/) && method === "POST") {
        const taskId = pathname.replace("/tasks/", "").replace("/subtasks", "");
        const body = request.postDataJSON() || {};
        const list = this.subtasks.get(taskId) ?? [];
        const newSubtask = {
          id: "sub-" + Date.now(),
          taskId,
          title: body.title,
          completed: false,
          position: list.length,
        };
        list.push(newSubtask);
        this.subtasks.set(taskId, list);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newSubtask),
        });
      }

      // MIT API
      if (pathname === "/tasks/mit" && method === "GET") {
        const task = this.tasks.find((t) => t.id === this.mitTaskId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ task: task ?? null }),
        });
      }

      if (pathname === "/tasks/mit" && method === "PUT") {
        const body = request.postDataJSON() || {};
        this.mitTaskId = body.taskId;
        const task = this.tasks.find((t) => t.id === this.mitTaskId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ task }),
        });
      }

      if (pathname === "/tasks/mit" && method === "DELETE") {
        this.mitTaskId = null;
        return route.fulfill({ status: 204, body: "" });
      }

      // Time blocks
      if (pathname === "/time-blocks" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: this.timeBlocks }),
        });
      }

      if (pathname === "/time-blocks" && method === "POST") {
        const body = request.postDataJSON() || {};
        const block = {
          id: "tb-" + Date.now(),
          title: body.title,
          category: body.category ?? "FOCUS",
          localDate: body.localDate ?? this.todayDate,
          startTime: body.startTime,
          endTime: body.endTime,
          taskId: body.taskId ?? null,
          projectId: body.projectId ?? null,
          status: "SCHEDULED",
          version: 1,
        };
        this.timeBlocks.push(block);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(block),
        });
      }

      // Focus Sessions
      if (pathname === "/focus-sessions/active" && method === "GET") {
        if (!this.focusSession) {
          return route.fulfill({
            status: 204,
            body: "",
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(this.focusSession),
        });
      }

      if (pathname === "/focus-sessions" && method === "POST") {
        const body = request.postDataJSON() || {};
        this.focusSession = {
          id: "focus-" + Date.now(),
          taskId: body.taskId ?? null,
          timeBlockId: body.timeBlockId ?? null,
          status: "RUNNING",
          phase: "FOCUS",
          plannedFocusDurationSeconds: body.plannedFocusDurationSeconds ?? 1500,
          plannedBreakDurationSeconds: body.plannedBreakDurationSeconds ?? 300,
          actualFocusDurationSeconds: 0,
          actualBreakDurationSeconds: 0,
          startedAt: new Date().toISOString(),
          phaseStartedAt: new Date().toISOString(),
          pausedAt: null,
          endedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          serverNow: new Date().toISOString(),
          version: 1,
          interruptions: [],
        };
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(this.focusSession),
        });
      }

      if (pathname.match(/^\/focus-sessions\/[^/]+\/pause$/) && method === "POST") {
        if (this.focusSession) {
          this.focusSession.status = "PAUSED";
          this.focusSession.pausedAt = new Date().toISOString();
          this.focusSession.version += 1;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(this.focusSession ?? {}),
        });
      }

      if (pathname.match(/^\/focus-sessions\/[^/]+\/resume$/) && method === "POST") {
        if (this.focusSession) {
          this.focusSession.status = "RUNNING";
          this.focusSession.pausedAt = null;
          this.focusSession.version += 1;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(this.focusSession ?? {}),
        });
      }

      if (pathname.match(/^\/focus-sessions\/[^/]+\/complete$/) && method === "POST") {
        if (this.focusSession) {
          this.focusSession.status = "COMPLETED";
          this.focusSession.endedAt = new Date().toISOString();
          this.focusSession.version += 1;
        }
        const session = this.focusSession;
        this.focusSession = null;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(session ?? {}),
        });
      }

      if (pathname.match(/^\/focus-sessions\/[^/]+\/cancel$/) && method === "POST") {
        if (this.focusSession) {
          this.focusSession.status = "CANCELLED";
          this.focusSession.endedAt = new Date().toISOString();
          this.focusSession.version += 1;
        }
        const session = this.focusSession;
        this.focusSession = null;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(session ?? {}),
        });
      }

      // Brain Dump
      if ((pathname === "/brain-dump-items" || pathname === "/brain-dump") && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: this.brainDump.map((b) => ({
              id: b.id,
              userId: this.user?.id ?? "user-1",
              content: b.content,
              status: b.convertedToType ? "CONVERTED" : b.archived ? "ARCHIVED" : "UNPROCESSED",
              archived: b.archived,
              version: b.version ?? 1,
              convertedToType: b.convertedToType ?? null,
              convertedToId: b.convertedToId ?? null,
              convertedAt: b.convertedAt ?? null,
              archivedAt: b.archivedAt ?? null,
              createdAt: b.createdAt ?? new Date().toISOString(),
              updatedAt: b.updatedAt ?? b.createdAt ?? new Date().toISOString(),
            })),
            page: 0,
            size: 100,
            totalItems: this.brainDump.length,
            totalPages: 1,
          }),
        });
      }

      if ((pathname === "/brain-dump-items" || pathname === "/brain-dump") && method === "POST") {
        const body = request.postDataJSON() || {};
        const now = new Date().toISOString();
        const item = {
          id: "bd-" + Date.now(),
          userId: this.user?.id ?? "user-1",
          content: body.content,
          status: "UNPROCESSED",
          archived: false,
          version: 1,
          convertedToType: null,
          convertedToId: null,
          convertedAt: null,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        this.brainDump.unshift(item);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(item),
        });
      }

      if (pathname.match(/^\/brain-dump-items\/[^/]+\/convert\/[a-z]+$/) && method === "POST") {
        const parts = pathname.split("/");
        const id = parts[2];
        const target = parts[4]?.toUpperCase();
        const item = this.brainDump.find((b) => b.id === id);
        if (item) {
          item.convertedToType = target;
          item.convertedToId = "conv-" + Date.now();
          item.convertedAt = new Date().toISOString();
          item.status = "CONVERTED";
          item.version = (item.version || 1) + 1;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(item ?? {}),
        });
      }

      if (pathname.match(/^\/brain-dump\/[^/]+\/convert$/) && method === "POST") {
        const id = pathname.replace("/brain-dump/", "").replace("/convert", "");
        const body = request.postDataJSON() || {};
        const item = this.brainDump.find((b) => b.id === id);
        if (item) {
          item.convertedToType = body.targetType;
          item.convertedToId = "created-" + Date.now();
          item.archived = true;
          item.status = "CONVERTED";
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(item ?? {}),
        });
      }

      // Notes
      if (pathname === "/notes" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: this.notes }),
        });
      }

      if (pathname === "/notes" && method === "POST") {
        const body = request.postDataJSON() || {};
        const note = {
          id: "note-" + Date.now(),
          title: body.title,
          body: body.body ?? "",
          labelIds: body.labelIds ?? [],
          links: body.links ?? [],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.notes.push(note);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(note),
        });
      }

      // Habits
      if (pathname === "/habits" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(this.habits),
        });
      }

      // Recurring Series
      if (pathname === "/recurring-series" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: this.recurringSeries }),
        });
      }

      if (pathname === "/recurring-series" && method === "POST") {
        const body = request.postDataJSON() || {};
        const series = {
          id: "rec-" + Date.now(),
          title: body.title,
          frequency: body.frequency ?? "WEEKLY",
          interval: body.interval ?? 1,
          daysOfWeek: body.daysOfWeek ?? ["MONDAY", "WEDNESDAY", "FRIDAY"],
          timeZone: this.user?.timeZone ?? "UTC",
          endRule: body.endRule ?? "NEVER",
          version: 1,
        };
        this.recurringSeries.push(series);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(series),
        });
      }

      // Reviews
      if (pathname === "/reviews/prompts" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            reviewType: url.searchParams.get("type") ?? "DAILY_MORNING",
            date: this.todayDate,
            prompts: [
              {
                id: "q1",
                text: "What are your top outcomes for today?",
                category: "INTENTION",
              },
              {
                id: "q2",
                text: "What potential obstacles might arise?",
                category: "RISK",
              },
            ],
            snapshotMetrics: {
              completedTasksCount: 0,
              focusMinutes: 0,
            },
          }),
        });
      }

      if (pathname === "/reviews/draft" && method === "POST") {
        const body = request.postDataJSON() || {};
        const rev = {
          id: "rev-" + Date.now(),
          type: body.type,
          periodKey: this.todayDate,
          status: "DRAFT",
          answers: body.answers ?? [],
        };
        this.reviews.push(rev);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(rev),
        });
      }

      if (pathname.match(/^\/reviews\/[^/]+\/finalize$/) && method === "POST") {
        const id = pathname.replace("/reviews/", "").replace("/finalize", "");
        const rev = this.reviews.find((r) => r.id === id);
        if (rev) {
          rev.status = "FINALIZED";
          rev.finalizedAt = new Date().toISOString();
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(rev ?? {}),
        });
      }

      // Weekly Plans
      if (
        (pathname === "/weekly-plans" || pathname.startsWith("/weekly-plans")) &&
        method === "GET"
      ) {
        const plan = this.weeklyPlans[0] ?? {
          id: "wp-" + Date.now(),
          weekStartDate: "2026-08-17",
          weekEndDate: "2026-08-23",
          timeZone: this.user?.timeZone ?? "UTC",
          weekStartDay: 1,
          revision: 1,
          status: "DRAFT",
          capacities: [
            { localDate: "2026-08-17", availableMinutes: 300 },
            { localDate: "2026-08-18", availableMinutes: 300 },
            { localDate: "2026-08-19", availableMinutes: 300 },
            { localDate: "2026-08-20", availableMinutes: 300 },
            { localDate: "2026-08-21", availableMinutes: 300 },
            { localDate: "2026-08-22", availableMinutes: 0 },
            { localDate: "2026-08-23", availableMinutes: 0 },
          ],
          outcomes: [{ id: "out-1", title: "Complete critical feature releases", position: 0 }],
          items: [],
          conflictSummary: {
            hasWarnings: false,
            totalPlannedMinutes: 0,
            totalCapacityMinutes: 1500,
            overcapacityMinutes: 0,
            overcapacityDates: [],
            overlappingTimeBlockCount: 0,
            unscheduledItemCount: 0,
            outcomesWithoutItemsCount: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };

        if (pathname === "/weekly-plans" || pathname.startsWith("/weekly-plans?")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([plan]),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(plan),
        });
      }

      // Search
      if (pathname === "/search" && method === "GET") {
        const query = (url.searchParams.get("q") ?? "").toLowerCase();
        const matchedProjects = this.projects.filter((p) => p.name?.toLowerCase().includes(query));
        const matchedTasks = this.tasks.filter((t) => t.title?.toLowerCase().includes(query));
        const matchedNotes = this.notes.filter((n) => n.title?.toLowerCase().includes(query));

        const projectItems = matchedProjects.map((p) => ({
          id: p.id,
          type: "PROJECT",
          title: p.name,
          snippet: p.description || p.name,
          score: 1.0,
          updatedAt: new Date().toISOString(),
          href: `/life-os/app/projects/${p.id}`,
        }));

        const taskItems = matchedTasks.map((t) => ({
          id: t.id,
          type: "TASK",
          title: t.title,
          snippet: t.description || t.title,
          score: 1.0,
          updatedAt: new Date().toISOString(),
          href: `/life-os/app/tasks/${t.id}`,
        }));

        const noteItems = matchedNotes.map((n) => ({
          id: n.id,
          type: "NOTE",
          title: n.title,
          snippet: n.body || n.title,
          score: 1.0,
          updatedAt: new Date().toISOString(),
          href: `/life-os/app/notes/${n.id}`,
        }));

        const allItems = [...projectItems, ...taskItems, ...noteItems];

        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            query,
            totalItems: allItems.length,
            page: 1,
            size: 50,
            totalPages: 1,
            counts: {
              PROJECT: projectItems.length,
              TASK: taskItems.length,
              NOTE: noteItems.length,
              BRAIN_DUMP: 0,
              GOAL: 0,
              HABIT: 0,
            },
            items: allItems,
            groups: [
              {
                type: "PROJECT",
                totalItems: projectItems.length,
                items: projectItems,
              },
              {
                type: "TASK",
                totalItems: taskItems.length,
                items: taskItems,
              },
              {
                type: "NOTE",
                totalItems: noteItems.length,
                items: noteItems,
              },
            ],
          }),
        });
      }

      // Sprints
      if (pathname === "/sprints" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(this.sprints),
        });
      }

      if (pathname.startsWith("/sprints/") && method === "GET") {
        const sprintId = pathname.replace("/sprints/", "");
        const sprint = this.sprints.find((s) => s.id === sprintId);
        if (sprint) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(sprint),
          });
        }
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ message: "Sprint not found" }),
        });
      }

      // Notifications
      if (pathname === "/notifications/unread-count" && method === "GET") {
        const count = this.notifications.filter((n) => !n.read).length;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count }),
        });
      }

      if (pathname === "/notifications" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: this.notifications }),
        });
      }

      // Reports
      if (pathname === "/reports/progress" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            startDate: this.todayDate,
            endDate: this.todayDate,
            completedTasksCount: this.tasks.filter((t) => t.status === "DONE").length,
            totalFocusMinutes: 25,
            activeProjectsCount: this.projects.length,
            streakDays: 5,
          }),
        });
      }

      // Default fallback
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "OK" }),
      });
    });
  }
}
