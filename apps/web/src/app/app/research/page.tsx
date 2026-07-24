import { ResearchWorkspace } from "@/components/research-workspace";
import { loadPrimaryResearchWorkspace } from "@/lib/research-api";
import { authenticatedSessionToken } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const authToken = await authenticatedSessionToken();
  let payload: Awaited<ReturnType<typeof loadPrimaryResearchWorkspace>> | null = null;
  let initialError: string | undefined;

  try {
    payload = await loadPrimaryResearchWorkspace(authToken);
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "The private research workspace is unavailable.";
  }

  return (
    <ResearchWorkspace
      initialDocuments={payload?.documents}
      initialError={initialError}
      initialMeta={payload?.meta}
      workspace={payload?.workspace}
    />
  );
}
