import { readPublicEnvironment } from "@app/environment";

/**
 * Safe `returnTo` handling (LOS-0508).
 *
 * `23-NAVIGATION-AND-ROUTES.md`: "go to login with a validated same-origin
 * relative `returnTo`" and "After login, navigate to valid `returnTo`;
 * otherwise Today." A `returnTo` value round-trips through a URL query
 * parameter, the one place in this app deliberately readable and writable by
 * anything with the address bar, so it is exactly the shape an open redirect
 * uses: `?returnTo=https://evil.example` or `?returnTo=//evil.example` would
 * send an authenticated user's browser somewhere this app never sent it.
 * Every value is validated against the current origin and against the
 * LifeOS app's own base path before it is ever used for navigation.
 */

const CANONICAL_LOGIN_PATH_SEGMENT = "login";
const CANONICAL_TODAY_PATH_SEGMENT = "app/today";

/** `/life-os/login` in production; follows `VITE_APP_BASE_PATH` everywhere else. */
export function loginPath(): string {
  return `${appBasePathWithoutTrailingSlash()}/${CANONICAL_LOGIN_PATH_SEGMENT}`;
}

/** `/life-os/app/today`, the safe default destination `23-NAVIGATION-AND-ROUTES.md` names. */
export function defaultAuthenticatedPath(): string {
  return `${appBasePathWithoutTrailingSlash()}/${CANONICAL_TODAY_PATH_SEGMENT}`;
}

/**
 * A `returnTo` is safe only if it stays inside the LifeOS app on this exact
 * origin: a root-relative path (never `//host/...`, which browsers resolve as
 * protocol-relative), no embedded scheme, no control characters a browser
 * could strip or reinterpret, and nested under the app's own base path — so a
 * value can never point at the unrelated main buildwithpartha site sharing
 * this origin, let alone another host entirely.
 */
export function isSafeReturnPath(candidate: string | null | undefined): candidate is string {
  if (!candidate || candidate.length === 0) {
    return false;
  }

  // A leading `//` or `/\` is treated as protocol-relative by browsers, and
  // an embedded `://` means a scheme was smuggled in past the leading slash.
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return false;
  }
  if (candidate.includes("://") || containsControlCharacter(candidate)) {
    return false;
  }

  let resolved: URL;
  try {
    resolved = new URL(candidate, window.location.origin);
  } catch {
    return false;
  }

  if (resolved.origin !== window.location.origin) {
    return false;
  }

  const appBasePath = readPublicEnvironment().appBasePath;
  return (
    resolved.pathname === trimTrailingSlash(appBasePath) ||
    resolved.pathname.startsWith(appBasePath)
  );
}

/** Builds the login path with an encoded, pre-validated `returnTo` destination. */
export function buildLoginPathWithReturnTo(returnTo: string | null | undefined): string {
  if (!isSafeReturnPath(returnTo)) {
    return loginPath();
  }
  return `${loginPath()}?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Resolves a `returnTo` query value read back off the login page's own URL
 * (LOS-0510's job) to a safe navigation target, falling back to Today for a
 * missing, malformed or unsafe value — never to the login page itself, which
 * would leave the user looking signed in but going nowhere.
 */
export function resolveReturnTarget(rawReturnTo: string | null | undefined): string {
  if (!rawReturnTo) {
    return defaultAuthenticatedPath();
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawReturnTo);
  } catch {
    return defaultAuthenticatedPath();
  }

  if (!isSafeReturnPath(decoded) || decoded === loginPath()) {
    return defaultAuthenticatedPath();
  }
  return decoded;
}

/** The current address, safe to offer back as a `returnTo` if the visitor is redirected to login. */
export function currentPathForReturnTo(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

function appBasePathWithoutTrailingSlash(): string {
  return trimTrailingSlash(readPublicEnvironment().appBasePath);
}

function trimTrailingSlash(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * True if `value` contains an ASCII control character (below the printable
 * range, or DEL). Checked by code point rather than a regex character class,
 * which keeps every one of those unprintable values out of source text
 * entirely.
 */
function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint !== undefined && (codePoint < 0x20 || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}
