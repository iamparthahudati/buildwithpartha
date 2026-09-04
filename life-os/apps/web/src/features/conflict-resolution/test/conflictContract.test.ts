import { describe, expect, it } from "vitest";
import {
  buildConflictCopyText,
  comparePayloadFields,
  formatFieldLabel,
  formatFieldValue,
  type ConflictDetails,
} from "../model/conflictContract";

describe("conflictContract model", () => {
  it("formats field labels cleanly", () => {
    expect(formatFieldLabel("title")).toBe("Title");
    expect(formatFieldLabel("dueDate")).toBe("Due Date");
    expect(formatFieldLabel("label_ids")).toBe("Label ids");
  });

  it("formats field values cleanly for display", () => {
    expect(formatFieldValue(null)).toBe("(empty)");
    expect(formatFieldValue(undefined)).toBe("(empty)");
    expect(formatFieldValue(true)).toBe("True");
    expect(formatFieldValue(false)).toBe("False");
    expect(formatFieldValue([])).toBe("(empty array)");
    expect(formatFieldValue(["work", "urgent"])).toBe("work, urgent");
    expect(formatFieldValue({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("compares local and server payloads and identifies differences", () => {
    const local = { title: "New Title", body: "Draft content", priority: "HIGH" };
    const server = { title: "Old Title", body: "Draft content", priority: "LOW" };

    const diffs = comparePayloadFields(local, server);
    expect(diffs).toHaveLength(3);

    const titleDiff = diffs.find((d) => d.field === "title");
    expect(titleDiff).toBeDefined();
    expect(titleDiff?.isDifferent).toBe(true);
    expect(titleDiff?.localValue).toBe("New Title");
    expect(titleDiff?.serverValue).toBe("Old Title");

    const bodyDiff = diffs.find((d) => d.field === "body");
    expect(bodyDiff?.isDifferent).toBe(false);
  });

  it("ignores standard version/meta fields during comparison", () => {
    const local = { title: "Task A", version: 1, updatedAt: "2026-09-01" };
    const server = { title: "Task A", version: 2, updatedAt: "2026-09-02" };

    const diffs = comparePayloadFields(local, server);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.field).toBe("title");
  });

  it("builds formatted copy text for clipboard backup", () => {
    const details: ConflictDetails = {
      entityId: "123",
      entityType: "Note",
      localVersion: 1,
      serverVersion: 2,
      localPayload: { title: "Local Title", body: "Local Body" },
      serverPayload: { title: "Server Title", body: "Local Body" },
      conflictTimestamp: "2026-09-05T01:00:00Z",
    };

    const copyText = buildConflictCopyText(details);
    expect(copyText).toContain("=== CONFLICT RESOLUTION BACKUP");
    expect(copyText).toContain("Entity: Note #123");
    expect(copyText).toContain("Local Title");
    expect(copyText).toContain("(Server had: Server Title)");
  });
});
