import { notFound } from "next/navigation";

import { AssetMonitorWorkspace } from "@/components/asset-monitor-workspace";
import { getAssetMonitorDefinition } from "@/lib/asset-monitors";
import { loadFreeAssetMonitor } from "@/lib/finance-api";

export const dynamic = "force-dynamic";

type AssetMonitorPageProps = {
  params: Promise<{ assetClass: string }>;
};

export default async function AssetClassMonitorPage({ params }: AssetMonitorPageProps) {
  const { assetClass } = await params;
  const definition = getAssetMonitorDefinition(assetClass);
  if (!definition || definition.id === "crypto") {
    notFound();
  }

  let payload: Awaited<ReturnType<typeof loadFreeAssetMonitor>> | undefined;
  let initialError: string | undefined;
  try {
    payload = await loadFreeAssetMonitor(assetClass);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "The asset-class monitor is unavailable.";
  }

  return <AssetMonitorWorkspace assetClass={assetClass} initialError={initialError} initialPayload={payload} />;
}
