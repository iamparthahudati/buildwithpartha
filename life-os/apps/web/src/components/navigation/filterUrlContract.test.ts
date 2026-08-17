import { describe, expect, it } from "vitest";

import { parseFilters, serializeFilters } from "./filterUrlContract";

describe("serializeFilters", () => {
  it("serializes a single-value filter", () => {
    expect(serializeFilters({ status: "open" }).toString()).toBe("status=open");
  });

  it("serializes an array filter as one repeated key", () => {
    const params = serializeFilters({ label: ["urgent", "bug"] });
    expect(params.getAll("label")).toEqual(["urgent", "bug"]);
  });

  it("omits an undefined value entirely", () => {
    expect(serializeFilters({ status: undefined }).toString()).toBe("");
  });

  it("omits an empty string value entirely", () => {
    expect(serializeFilters({ status: "" }).toString()).toBe("");
  });

  it("omits an empty array entirely", () => {
    expect(serializeFilters({ label: [] }).toString()).toBe("");
  });

  it("serializes several filters together", () => {
    const params = serializeFilters({ status: "open", assignee: "ada" });
    expect(params.get("status")).toBe("open");
    expect(params.get("assignee")).toBe("ada");
  });
});

describe("parseFilters", () => {
  it("reads back a single-value filter", () => {
    const params = new URLSearchParams("status=open");
    expect(parseFilters(params, ["status"])).toEqual({ status: "open" });
  });

  it("reads back a multi-value filter as an array", () => {
    const params = new URLSearchParams("label=urgent&label=bug");
    expect(parseFilters(params, ["label"], ["label"])).toEqual({ label: ["urgent", "bug"] });
  });

  it("omits a key that is not present in the URL at all", () => {
    const params = new URLSearchParams("status=open");
    expect(parseFilters(params, ["status", "assignee"])).toEqual({ status: "open" });
  });

  it("omits a multi-value key with no entries in the URL", () => {
    const params = new URLSearchParams("status=open");
    expect(parseFilters(params, ["status", "label"], ["label"])).toEqual({ status: "open" });
  });

  it("ignores keys in the URL that were not asked for", () => {
    const params = new URLSearchParams("status=open&utm_source=newsletter");
    expect(parseFilters(params, ["status"])).toEqual({ status: "open" });
  });

  it("round-trips through serialize and parse", () => {
    const original = { status: "open", label: ["urgent", "bug"] };
    const params = serializeFilters(original);
    expect(parseFilters(params, ["status", "label"], ["label"])).toEqual(original);
  });
});
