import { apiRequest } from "@lib/apiClient";

/**
 * Typed calls against `/auth/*` (LOS-0508, LOS-0516), mirroring the request/response
 * record shapes in `tech.buildwithpartha.lifeos.auth.api` field for field —
 * see `SignupRequest`, `LoginRequest`, `VerifyEmailRequest`, and each
 * matching `*Response` record. Every call goes through `apiRequest`
 * (`@lib/apiClient`), so same-origin credentials and CSRF attachment are
 * never re-decided per endpoint.
 */

export interface SignupRequest {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly termsVersion: string;
  readonly privacyVersion: string;
}

export interface SignupResponse {
  readonly status: "PENDING_VERIFICATION";
}

export function signup(request: SignupRequest): Promise<SignupResponse> {
  return apiRequest<SignupResponse>("/auth/signup", { method: "POST", body: request });
}

export interface VerifyEmailRequest {
  readonly token: string;
}

export interface VerifyEmailResponse {
  readonly status: "VERIFIED";
}

export function verifyEmail(request: VerifyEmailRequest): Promise<VerifyEmailResponse> {
  return apiRequest<VerifyEmailResponse>("/auth/verify-email", { method: "POST", body: request });
}

export interface ResendVerificationRequest {
  readonly email: string;
}

export interface ResendVerificationResponse {
  readonly status: "PENDING_VERIFICATION";
}

export function resendVerification(
  request: ResendVerificationRequest,
): Promise<ResendVerificationResponse> {
  return apiRequest<ResendVerificationResponse>("/auth/resend-verification", {
    method: "POST",
    body: request,
  });
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

/** `LoginResponse.java`'s safe shape: enough of the account to render the shell, plus the CSRF bootstrap. */
export interface LoginResponse {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
  readonly csrfToken: string;
}

export function login(request: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", { method: "POST", body: request });
}

export interface LogoutResponse {
  readonly status: "LOGGED_OUT";
}

/**
 * Revokes only the current session. Always resolves — `AuthController.logout`
 * returns `200`/`LOGGED_OUT` even with no active session at all — except when
 * an active session's CSRF header does not match, which `apiRequest` reports
 * as a rejected promise (`403`/`CSRF_TOKEN_INVALID`) leaving the session
 * untouched.
 */
export function logout(): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>("/auth/logout", { method: "POST" });
}

/** Revokes every session for the current account, this one included. */
export function logoutAll(): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>("/auth/logout-all", { method: "POST" });
}

export interface ForgotPasswordRequest {
  readonly email: string;
}

export interface ForgotPasswordResponse {
  readonly status: "REQUESTED";
}

export function forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: request,
  });
}

export interface ResetPasswordRequest {
  readonly token: string;
  readonly newPassword: string;
}

export interface ResetPasswordResponse {
  readonly status: "PASSWORD_RESET";
}

export function resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: request,
  });
}

export interface ChangePasswordRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface ChangePasswordResponse {
  readonly status: string;
}

export function changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>("/auth/change-password", {
    method: "POST",
    body: request,
  });
}

export interface SessionInfo {
  readonly id: string;
  readonly deviceHint: string | null;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly isCurrent: boolean;
}

export interface SessionListResponse {
  readonly sessions: readonly SessionInfo[];
}

export function listSessions(): Promise<SessionListResponse> {
  return apiRequest<SessionListResponse>("/auth/sessions", { method: "GET" });
}

export interface RevokeSessionResponse {
  readonly revoked: boolean;
}

export function revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
  return apiRequest<RevokeSessionResponse>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export interface RevokeAllOtherSessionsResponse {
  readonly revokedCount: number;
}

export function revokeAllOtherSessions(): Promise<RevokeAllOtherSessionsResponse> {
  return apiRequest<RevokeAllOtherSessionsResponse>("/auth/sessions/revoke-others", {
    method: "POST",
  });
}
