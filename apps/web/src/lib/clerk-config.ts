export function hasClerkPublishableKey() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

export function hasClerkRuntimeKeys() {
  return hasClerkPublishableKey() && Boolean(process.env.CLERK_SECRET_KEY?.trim());
}

export const clerkUnavailableMessage =
  "Authentication is not configured for this deployment. Add Clerk production keys to enable the workspace.";
