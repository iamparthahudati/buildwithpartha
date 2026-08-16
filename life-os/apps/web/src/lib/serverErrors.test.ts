import { describe, expect, it } from "vitest";

import { groupFieldProblems } from "./serverErrors";

describe("groupFieldProblems", () => {
  it("groups each field to its first violation code", () => {
    expect(
      groupFieldProblems([
        { field: "title", code: "NotBlank" },
        { field: "estimateMinutes", code: "Positive" },
      ]),
    ).toEqual({ title: "NotBlank", estimateMinutes: "Positive" });
  });

  it("keeps the first code when a field carries more than one violation", () => {
    // A required-field check arrives before a length check; a form shows one
    // error per field, so the earliest, most fundamental one wins.
    expect(
      groupFieldProblems([
        { field: "title", code: "NotBlank" },
        { field: "title", code: "Size" },
      ]),
    ).toEqual({ title: "NotBlank" });
  });

  it("returns an empty object for no problems", () => {
    expect(groupFieldProblems(undefined)).toEqual({});
    expect(groupFieldProblems([])).toEqual({});
  });
});
