import "server-only";

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

export function bearerTokenFromRequest(request: Request, fallbackToken = process.env.FINANCE_API_DEV_TOKEN ?? "dev:user_demo") {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return fallbackToken;
}
