import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getReportPresetDates,
  saveRecentReportSettings,
  loadRecentReportSettings,
  clearRecentReportSettings,
  type SavedReportSettings,
} from "../model/reports";

describe("reports model", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getReportPresetDates", () => {
    const refDate = new Date(2026, 7, 27); // 2026-08-27 (Thursday)

    it("computes TODAY preset", () => {
      const dates = getReportPresetDates("TODAY", refDate);
      expect(dates).toEqual({ startDate: "2026-08-27", endDate: "2026-08-27" });
    });

    it("computes THIS_WEEK preset (Monday to Sunday)", () => {
      const dates = getReportPresetDates("THIS_WEEK", refDate);
      expect(dates.startDate).toBe("2026-08-24");
      expect(dates.endDate).toBe("2026-08-30");
    });

    it("computes THIS_MONTH preset", () => {
      const dates = getReportPresetDates("THIS_MONTH", refDate);
      expect(dates).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
    });

    it("computes THIS_QUARTER preset", () => {
      const dates = getReportPresetDates("THIS_QUARTER", refDate);
      expect(dates).toEqual({ startDate: "2026-07-01", endDate: "2026-09-30" });
    });

    it("computes THIS_YEAR preset", () => {
      const dates = getReportPresetDates("THIS_YEAR", refDate);
      expect(dates).toEqual({ startDate: "2026-01-01", endDate: "2026-12-31" });
    });

    it("defaults CUSTOM preset to current month dates", () => {
      const dates = getReportPresetDates("CUSTOM", refDate);
      expect(dates).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
    });
  });

  describe("localStorage recent report settings", () => {
    const sampleSettings: SavedReportSettings = {
      reportType: "TIME_ALLOCATION",
      periodPreset: "THIS_MONTH",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      category: "Engineering",
    };

    it("returns null when no settings are stored", () => {
      expect(loadRecentReportSettings()).toBeNull();
    });

    it("saves and loads recent settings", () => {
      saveRecentReportSettings(sampleSettings);
      const loaded = loadRecentReportSettings();
      expect(loaded).toEqual(sampleSettings);
    });

    it("clears saved settings", () => {
      saveRecentReportSettings(sampleSettings);
      clearRecentReportSettings();
      expect(loadRecentReportSettings()).toBeNull();
    });
  });
});
