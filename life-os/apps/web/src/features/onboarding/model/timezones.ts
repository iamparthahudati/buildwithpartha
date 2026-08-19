import { formatLocalDate, nowLocalTime, todayLocalDate } from "@lib/localDateTime";

/**
 * Timezone helpers for onboarding (LOS-0514, 25-ONBOARDING-SPECIFICATION.md).
 * Resolves browser timezone, lists server-compatible IANA timezones,
 * and produces deterministic previews for date/time interpretation.
 */

const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Calcutta",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Manila",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Honolulu",
] as const;

export interface TimezoneOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Detects the browser's current IANA timezone identifier, falling back to UTC
 * if detection fails or returns an invalid zone.
 */
export function detectBrowserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && isValidTimezone(detected)) {
      return detected;
    }
  } catch {
    // Ignore and fallback
  }
  return "UTC";
}

/**
 * Checks whether a timezone identifier is supported by the JavaScript runtime.
 */
export function isValidTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") {
    return false;
  }
  if (timeZone === "UTC") {
    return true;
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns available IANA timezone options.
 */
export function getAvailableTimezones(): readonly TimezoneOption[] {
  const zones = new Set<string>(FALLBACK_TIMEZONES);

  if (
    typeof Intl !== "undefined" &&
    typeof (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf === "function"
  ) {
    try {
      const supported = (
        Intl as unknown as { supportedValuesOf: (key: string) => string[] }
      ).supportedValuesOf("timeZone");
      for (const z of supported) {
        zones.add(z);
      }
    } catch {
      // Keep fallback
    }
  }

  zones.add("UTC");
  zones.add("Asia/Kolkata");

  const unique = Array.from(zones).sort((a, b) => {
    if (a === "UTC") return -1;
    if (b === "UTC") return 1;
    return a.localeCompare(b);
  });

  return unique.map((zone) => ({
    value: zone,
    label: zone === "UTC" ? "UTC (Coordinated Universal Time)" : zone.replace(/_/g, " "),
  }));
}

export interface TimezonePreview {
  readonly todayDate: string;
  readonly formattedToday: string;
  readonly currentTime: string;
  readonly sampleBlock: string;
}

/**
 * Computes a human-readable preview of what "Today" and local block times look like
 * for a given timezone and locale.
 */
export function formatTimezonePreview(
  timeZone: string,
  locale = "en-US",
  now: Date = new Date(),
): TimezonePreview {
  const safeZone = isValidTimezone(timeZone) ? timeZone : "UTC";
  const today = todayLocalDate(safeZone, now);
  const formattedToday = formatLocalDate(today, locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const currentTime = nowLocalTime(safeZone, now);

  return {
    todayDate: today,
    formattedToday,
    currentTime,
    sampleBlock: "09:00 – 10:00",
  };
}
