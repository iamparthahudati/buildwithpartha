import { describe, expect, it } from "vitest";

import {
  donutSegments,
  donutSlicePath,
  linearScale,
  pointOnCircle,
  valueDomain,
} from "./chartScale";

describe("linearScale", () => {
  it("maps a value linearly from domain to range", () => {
    const scale = linearScale([0, 10], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(100);
  });

  it("maps a negative domain value below the range's start", () => {
    const scale = linearScale([-10, 10], [0, 100]);
    expect(scale(-10)).toBe(0);
    expect(scale(0)).toBe(50);
  });

  it("returns the range midpoint for a degenerate (zero-width) domain", () => {
    const scale = linearScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(50);
  });
});

describe("valueDomain", () => {
  it("always includes zero as the baseline", () => {
    expect(valueDomain([3, 5, 9])).toEqual([0, 9]);
  });

  it("extends below zero for negative values", () => {
    expect(valueDomain([-4, 2, 6])).toEqual([-4, 6]);
  });

  it("never collapses to a single point, even for an all-zero series", () => {
    const [min, max] = valueDomain([0, 0, 0]);
    expect(min).toBeLessThan(max);
  });
});

describe("donutSegments", () => {
  it("splits values into consecutive arcs summing to a full circle", () => {
    const segments = donutSegments([1, 1, 2]);
    expect(segments[0]).toEqual({ startAngle: 0, endAngle: Math.PI / 2 });
    expect(segments[1]).toEqual({ startAngle: Math.PI / 2, endAngle: Math.PI });
    expect(segments[2]).toEqual({ startAngle: Math.PI, endAngle: 2 * Math.PI });
  });

  it("reads a negative value as zero rather than a negative sweep", () => {
    const segments = donutSegments([-5, 5]);
    expect(segments[0]).toEqual({ startAngle: 0, endAngle: 0 });
    expect(segments[1]).toEqual({ startAngle: 0, endAngle: 2 * Math.PI });
  });

  it("returns zero-sweep segments for an all-zero series rather than dividing by zero", () => {
    const segments = donutSegments([0, 0]);
    expect(segments).toEqual([
      { startAngle: 0, endAngle: 0 },
      { startAngle: 0, endAngle: 0 },
    ]);
  });
});

describe("pointOnCircle", () => {
  it("places angle 0 at twelve o'clock, directly above the center", () => {
    const point = pointOnCircle(0, 0, 10, 0);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(-10);
  });

  it("places a quarter turn at three o'clock", () => {
    const point = pointOnCircle(0, 0, 10, Math.PI / 2);
    expect(point.x).toBeCloseTo(10);
    expect(point.y).toBeCloseTo(0);
  });
});

describe("donutSlicePath", () => {
  it("returns an empty path for a zero-sweep segment", () => {
    expect(donutSlicePath(0, 0, 10, 5, { startAngle: 0, endAngle: 0 })).toBe("");
  });

  it("returns a real path for a normal segment", () => {
    const path = donutSlicePath(0, 0, 10, 5, { startAngle: 0, endAngle: Math.PI / 2 });
    expect(path).toMatch(/^M .* A .* L .* A .* Z$/);
  });

  it("does not throw or degenerate for a full-circle (single 100%) segment", () => {
    const path = donutSlicePath(0, 0, 10, 5, { startAngle: 0, endAngle: 2 * Math.PI });
    expect(path).toMatch(/^M .* A .* L .* A .* Z$/);
    expect(path.length).toBeGreaterThan(0);
  });
});
