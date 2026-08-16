const REQUIRED_PUBLIC_KEYS = ["VITE_APP_BASE_PATH", "VITE_API_BASE_PATH"] as const;

type RequiredPublicKey = (typeof REQUIRED_PUBLIC_KEYS)[number];
type EnvironmentSource = Readonly<Record<string, unknown>>;

export type PublicEnvironment = Readonly<{
  appBasePath: string;
  apiBasePath: string;
}>;

export function validatePublicEnvironment(source: EnvironmentSource): PublicEnvironment {
  const missingKeys = REQUIRED_PUBLIC_KEYS.filter((key) => !readNonBlankString(source, key));

  if (missingKeys.length > 0) {
    throw configurationError("missing", missingKeys);
  }

  const appBasePath = readNonBlankString(source, "VITE_APP_BASE_PATH") as string;
  const apiBasePath = readNonBlankString(source, "VITE_API_BASE_PATH") as string;
  const invalidKeys: RequiredPublicKey[] = [];

  if (!isAbsoluteDirectoryPath(appBasePath)) {
    invalidKeys.push("VITE_APP_BASE_PATH");
  }

  if (!isNestedApiPath(appBasePath, apiBasePath)) {
    invalidKeys.push("VITE_API_BASE_PATH");
  }

  if (invalidKeys.length > 0) {
    throw configurationError("invalid", invalidKeys);
  }

  return Object.freeze({ appBasePath, apiBasePath });
}

export function readPublicEnvironment(): PublicEnvironment {
  return validatePublicEnvironment({
    VITE_APP_BASE_PATH: import.meta.env.VITE_APP_BASE_PATH,
    VITE_API_BASE_PATH: import.meta.env.VITE_API_BASE_PATH,
  });
}

function readNonBlankString(source: EnvironmentSource, key: RequiredPublicKey) {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isAbsoluteDirectoryPath(path: string) {
  return path.startsWith("/") && path.endsWith("/") && !/[?#]/.test(path) && !path.includes("//");
}

function isNestedApiPath(appBasePath: string, apiBasePath: string) {
  const apiRoot = `${appBasePath.replace(/\/$/, "")}/api`;
  return (
    isAbsolutePath(apiBasePath) &&
    !apiBasePath.endsWith("/") &&
    (apiBasePath === apiRoot || apiBasePath.startsWith(`${apiRoot}/`))
  );
}

function isAbsolutePath(path: string) {
  return path.startsWith("/") && !/[?#]/.test(path) && !path.includes("//");
}

function configurationError(reason: "missing" | "invalid", keys: readonly RequiredPublicKey[]) {
  return new Error(
    `LifeOS frontend environment validation failed; ${reason} keys: ${keys.join(", ")}`,
  );
}
