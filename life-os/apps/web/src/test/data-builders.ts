export const TEST_IDS = Object.freeze({
  user: "00000000-0000-4000-8000-000000000001",
  project: "00000000-0000-4000-8000-000000000002",
  task: "00000000-0000-4000-8000-000000000003",
});

export const TEST_INSTANT = "2026-08-16T08:30:00Z";
export const TEST_TIME_ZONE = "Asia/Kolkata";

export type ProjectStatus = "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type TaskStatus = "TO_DO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  timeZone: string;
}

export interface TestProject {
  id: string;
  userId: string;
  title: string;
  status: ProjectStatus;
}

export interface TestTask {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  status: TaskStatus;
  dueAt: string;
}

export interface TestTime {
  instant: string;
  timeZone: string;
  localDate: string;
}

export function buildTestUser(overrides: Partial<TestUser> = {}): Readonly<TestUser> {
  const fixture = {
    id: TEST_IDS.user,
    email: "account@example.test",
    displayName: "Test account",
    locale: "en-IN",
    timeZone: TEST_TIME_ZONE,
    ...overrides,
  };
  validateTimeZone(fixture.timeZone);
  return Object.freeze(fixture);
}

export function buildTestProject(overrides: Partial<TestProject> = {}): Readonly<TestProject> {
  return Object.freeze({
    id: TEST_IDS.project,
    userId: TEST_IDS.user,
    title: "Portfolio refresh",
    status: "ACTIVE",
    ...overrides,
  });
}

export function buildTestTask(overrides: Partial<TestTask> = {}): Readonly<TestTask> {
  return Object.freeze({
    id: TEST_IDS.task,
    userId: TEST_IDS.user,
    projectId: TEST_IDS.project,
    title: "Prepare weekly review",
    status: "TO_DO",
    dueAt: TEST_INSTANT,
    ...overrides,
  });
}

export function buildTestTime(
  overrides: Partial<Pick<TestTime, "instant" | "timeZone">> = {},
): Readonly<TestTime> {
  const instant = overrides.instant ?? TEST_INSTANT;
  const timeZone = overrides.timeZone ?? TEST_TIME_ZONE;
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid test instant: ${instant}`);
  }

  validateTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const localDate = `${values.year}-${values.month}-${values.day}`;

  return Object.freeze({ instant, timeZone, localDate });
}

function validateTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch (error) {
    throw new RangeError(`Invalid test time zone: ${timeZone}`, { cause: error });
  }
}
