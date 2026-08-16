import { describe, expect, it } from "vitest";

import {
  TEST_IDS,
  buildTestProject,
  buildTestTask,
  buildTestTime,
  buildTestUser,
} from "./data-builders";

describe("test data builders", () => {
  it("creates linked deterministic neutral fixtures", () => {
    const firstUser = buildTestUser();
    const secondUser = buildTestUser();
    const project = buildTestProject();
    const task = buildTestTask();

    expect(firstUser).toEqual(secondUser);
    expect(firstUser).toEqual({
      id: TEST_IDS.user,
      email: "account@example.test",
      displayName: "Test account",
      locale: "en-IN",
      timeZone: "Asia/Kolkata",
    });
    expect(project).toMatchObject({
      userId: firstUser.id,
      title: "Portfolio refresh",
      status: "ACTIVE",
    });
    expect(task).toMatchObject({
      userId: firstUser.id,
      projectId: project.id,
      title: "Prepare weekly review",
      status: "TO_DO",
    });
  });

  it("supports isolated overrides without mutating defaults", () => {
    const project = buildTestProject({ title: "Learning plan", status: "ON_HOLD" });
    const task = buildTestTask({ projectId: null, title: "Compare hosting options" });

    expect(project).toMatchObject({ title: "Learning plan", status: "ON_HOLD" });
    expect(task).toMatchObject({ projectId: null, title: "Compare hosting options" });
    expect(buildTestProject().title).toBe("Portfolio refresh");
    expect(buildTestTask().projectId).toBe(TEST_IDS.project);
    expect(Object.isFrozen(project)).toBe(true);
    expect(Object.isFrozen(task)).toBe(true);
  });

  it("derives the local date from an explicit IANA timezone", () => {
    const instant = "2026-01-01T00:30:00Z";

    expect(buildTestTime({ instant, timeZone: "Asia/Kolkata" })).toEqual({
      instant,
      timeZone: "Asia/Kolkata",
      localDate: "2026-01-01",
    });
    expect(buildTestTime({ instant, timeZone: "America/Los_Angeles" })).toEqual({
      instant,
      timeZone: "America/Los_Angeles",
      localDate: "2025-12-31",
    });
  });

  it("rejects invalid time controls", () => {
    expect(() => buildTestTime({ instant: "not-an-instant" })).toThrow("Invalid test instant");
    expect(() => buildTestTime({ timeZone: "Invalid/Zone" })).toThrow("Invalid test time zone");
    expect(() => buildTestUser({ timeZone: "Invalid/Zone" })).toThrow("Invalid test time zone");
  });
});
