/**
 * Terms/privacy version literals sent with every signup (LOS-0509).
 *
 * `SignupRequest.java` accepts these as opaque client-supplied strings —
 * `31-PRIVACY-DATA-LIFECYCLE.md` requires terms acceptance and privacy notice
 * acknowledgment to stay two separate consent records, which is why there are
 * two constants even though they currently share one date. No "current
 * published version" registry exists yet (real legal copy/versions are
 * LOS-1614's job); these match the literals `AuthControllerTests.java`
 * already exercises so signup stays consistent with what the backend accepts
 * today. Update both together, and only when a new terms/privacy document is
 * actually published.
 */
export const TERMS_VERSION = "2026-08-01";
export const PRIVACY_VERSION = "2026-08-01";
