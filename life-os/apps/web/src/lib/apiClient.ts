import { readPublicEnvironment } from "@app/environment";

import type { FieldProblem } from "./serverErrors";

/**
 * Same-origin JSON API client (LOS-0508).
 *
 * A single `fetch` wrapper every feature's API module calls through, so the
 * three cross-cutting rules `02-ARCHITECTURE.md`/`06-SECURITY.md` require of
 * every request are enforced in one place instead of at each call site:
 *
 * - same-origin, cookie-carrying requests (`credentials: "same-origin"`),
 *   never a bearer token read from browser storage — the session lives only
 *   in the `HttpOnly` `lifeos_session` cookie this module never touches;
 * - the `X-CSRF-TOKEN` header is attached automatically to every mutating
 *   request once a token is known, from whatever currently holds it
 *   ({@code state/AuthSessionProvider}), never from `localStorage` or
 *   `sessionStorage`;
 * - a `401` carrying the generic `AUTHENTICATION_REQUIRED` code (LOS-0213's
 *   Problem Details shape) is the one signal this module treats as "the
 *   session is gone" and reports through {@link configureApiClient}'s
 *   `onAuthenticationRequired` callback — `23-NAVIGATION-AND-ROUTES.md`'s
 *   "On 401 ... go to login with a validated same-origin relative returnTo".
 *
 * `configureApiClient` is a plain setter rather than this module importing
 * `@state` directly: `lib/` stays a leaf with no dependency on application
 * state, and the one caller that actually holds the session
 * (`state/AuthSessionProvider`) wires itself in in a `useEffect` once, at
 * bootstrap. Before that call lands (or in a test that never calls it) every
 * mutating request simply carries no CSRF header and a 401 is not reported
 * anywhere — safe defaults, not a crash.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER_NAME = "X-CSRF-TOKEN";

/** LOS-0213's versioned Problem Details shape, as received by the browser. */
export interface ApiProblem {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly code: string;
  readonly correlationId: string;
  readonly errors?: readonly FieldProblem[];
}

/**
 * Thrown for every non-2xx response. `problem` is present whenever the
 * response body was valid Problem Details JSON (every documented failure);
 * it is absent only for a transport-level failure that never reached the API
 * (a network error, or a response the API contract does not describe).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ApiProblem | undefined;

  constructor(status: number, problem: ApiProblem | undefined, options?: ErrorOptions) {
    super(problem?.detail ?? `Request failed with status ${status}.`, options);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

interface ApiClientConfiguration {
  readonly getCsrfToken: () => string | null;
  readonly onAuthenticationRequired: () => void;
}

let configuration: ApiClientConfiguration | undefined;

/**
 * Wires the client to whatever currently holds the CSRF token and owns
 * recovering from a lost session. Intended to be called once, from
 * `state/AuthSessionProvider`'s mount effect; calling it again (a second
 * provider instance, a test) simply replaces the previous wiring.
 */
export function configureApiClient(next: ApiClientConfiguration): void {
  configuration = next;
}

/** Test-only escape hatch: restores the unconfigured default. */
export function resetApiClientConfiguration(): void {
  configuration = undefined;
}

export interface ApiRequestInit {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  /** Additional endpoint-specific headers such as optimistic `If-Match` versions. */
  readonly headers?: Readonly<Record<string, string>>;
  /** When true, a 401 does not clear the in-memory session or redirect to login. */
  readonly suppressAuthenticationRecovery?: boolean;
}

/**
 * Issues one same-origin JSON request against the LifeOS API and returns the
 * parsed response body. `TResponse` is `void` for a request whose success
 * response has no body (e.g. logout's `204`-shaped intent is actually `200`
 * with a body here, but a future endpoint may not have one).
 */
export async function apiRequest<TResponse = void>(
  path: string,
  init: ApiRequestInit = {},
): Promise<TResponse> {
  const method = init.method ?? "GET";
  const { apiBasePath } = readPublicEnvironment();
  const headers = new Headers(init.headers);

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = configuration?.getCsrfToken() ?? null;
    if (csrfToken !== null) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${apiBasePath}${path}`, {
      method,
      headers,
      credentials: "same-origin",
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      ...(init.signal === undefined ? {} : { signal: init.signal }),
    });
  } catch (cause) {
    throw new ApiError(0, undefined, { cause });
  }

  if (response.ok) {
    return (await readBody(response)) as TResponse;
  }

  const problem = await readProblem(response);
  if (problem?.code === "AUTHENTICATION_REQUIRED" && !init.suppressAuthenticationRecovery) {
    configuration?.onAuthenticationRequired();
  }
  throw new ApiError(response.status, problem);
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  return text.length === 0 ? undefined : JSON.parse(text);
}

async function readProblem(response: Response): Promise<ApiProblem | undefined> {
  try {
    const text = await response.text();
    return text.length === 0 ? undefined : (JSON.parse(text) as ApiProblem);
  } catch {
    return undefined;
  }
}
