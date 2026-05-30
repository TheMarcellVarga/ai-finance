import "server-only";

import { auth } from "@clerk/nextjs/server";

export class AuthenticationRequiredError extends Error {
  readonly code = "authentication_required";

  constructor() {
    super("Sign in to access the Aperture workspace.");
    this.name = "AuthenticationRequiredError";
  }
}

export function isAuthenticationRequiredError(error: unknown): error is AuthenticationRequiredError {
  return error instanceof AuthenticationRequiredError;
}

export function authenticationRequiredResponse() {
  return Response.json(
    { error: { code: "authentication_required", message: "Sign in to access the Aperture workspace." } },
    { status: 401 },
  );
}

export function decodeJwtSubject(token?: string | null) {
  if (!token || token.startsWith("dev:")) {
    return token?.startsWith("dev:") ? token.slice("dev:".length) : "user_demo";
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return "user_unknown";
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return typeof decoded.sub === "string" && decoded.sub ? decoded.sub : "user_unknown";
  } catch {
    return "user_unknown";
  }
}

function explicitDevelopmentToken(request?: Request) {
  if (!request || process.env.NODE_ENV === "production") {
    return null;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return null;
}

export async function authenticatedSessionToken() {
  const { getToken, userId } = await auth();
  if (!userId) {
    throw new AuthenticationRequiredError();
  }

  // Keep local Go development owner-scoped without requiring Clerk JWKS setup.
  if (process.env.NODE_ENV !== "production" && process.env.FINANCE_API_AUTH_MODE !== "clerk") {
    return `dev:${userId}`;
  }

  const token = await getToken();
  if (!token) {
    throw new AuthenticationRequiredError();
  }
  return token;
}

export async function authenticatedTokenFromRequest(request: Request) {
  return explicitDevelopmentToken(request) ?? authenticatedSessionToken();
}
