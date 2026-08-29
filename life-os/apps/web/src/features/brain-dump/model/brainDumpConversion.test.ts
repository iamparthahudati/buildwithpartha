import { describe, expect, it } from "vitest";
import {
  buildConvertRequest,
  deriveConvertTitle,
  initialConvertFields,
} from "./brainDumpConversion";
import { convertedEntityPath } from "./brainDumpItem";

describe("deriveConvertTitle", () => {
  it("uses the first non-empty line", () => {
    expect(deriveConvertTitle("\n  Buy milk  \nand eggs")).toBe("Buy milk");
  });

  it("falls back to trimmed content when there is no line break", () => {
    expect(deriveConvertTitle("  single thought  ")).toBe("single thought");
  });

  it("caps the title at the backend limit", () => {
    const long = "x".repeat(600);
    expect(deriveConvertTitle(long)).toHaveLength(500);
  });
});

describe("initialConvertFields", () => {
  it("defaults the note body to the full content and derives a title", () => {
    const fields = initialConvertFields("Line one\nline two");
    expect(fields.title).toBe("Line one");
    expect(fields.body).toBe("Line one\nline two");
    expect(fields.priority).toBe("P3");
    expect(fields.category).toBe("PERSONAL");
    expect(fields.progressType).toBe("BINARY");
    expect(fields.checkInCadence).toBe("WEEKLY");
  });
});

describe("buildConvertRequest", () => {
  const fields = {
    title: "  My thing  ",
    description: "  details  ",
    body: "  the body  ",
    priority: "P2",
    category: "HEALTH",
    progressType: "NUMERIC",
    checkInCadence: "DAILY",
  };

  it("builds a task payload with priority and version", () => {
    expect(buildConvertRequest("TASK", fields, 3)).toEqual({
      title: "My thing",
      priority: "P2",
      version: 3,
      description: "details",
    });
  });

  it("builds a note payload with a required body", () => {
    expect(buildConvertRequest("NOTE", fields, 0)).toEqual({
      title: "My thing",
      body: "the body",
      version: 0,
    });
  });

  it("falls back to the title when the note body is blank", () => {
    expect(buildConvertRequest("NOTE", { ...fields, body: "   " }, 0)).toEqual({
      title: "My thing",
      body: "My thing",
      version: 0,
    });
  });

  it("builds a project payload keyed on name", () => {
    expect(buildConvertRequest("PROJECT", fields, 1)).toEqual({
      name: "My thing",
      priority: "P2",
      version: 1,
      description: "details",
    });
  });

  it("builds a goal payload with category/progress/cadence", () => {
    expect(buildConvertRequest("GOAL", { ...fields, description: "" }, 5)).toEqual({
      title: "My thing",
      category: "HEALTH",
      progressType: "NUMERIC",
      checkInCadence: "DAILY",
      version: 5,
    });
  });
});

describe("convertedEntityPath", () => {
  it("maps each destination to its app route", () => {
    expect(convertedEntityPath("TASK", "t1")).toBe("/life-os/app/tasks/t1");
    expect(convertedEntityPath("NOTE", "n1")).toBe("/life-os/app/notes/n1");
    expect(convertedEntityPath("PROJECT", "p1")).toBe("/life-os/app/projects/p1");
    expect(convertedEntityPath("GOAL", "g1")).toBe("/life-os/app/goals/g1");
  });
});
