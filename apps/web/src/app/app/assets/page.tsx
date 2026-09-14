import { GlobalAssetMonitorWorkspace } from "@/components/global-asset-monitor-workspace";
import { loadRealProviderAssetCatalog } from "@/lib/finance-api";

export const dynamic = "force-dynamic";

export default async function GlobalAssetMonitorPage() {
  let catalog: Awaited<ReturnType<typeof loadRealProviderAssetCatalog>> | undefined;
  let initialError: string | undefined;

  try {
    catalog = await loadRealProviderAssetCatalog();
  } catch (error) {
    initialError = error instanceof Error ? error.message : "The asset catalog is temporarily unavailable.";
  }

  return <GlobalAssetMonitorWorkspace initialCatalog={catalog?.data} initialError={initialError} />;
}
