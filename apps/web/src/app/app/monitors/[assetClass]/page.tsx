import { notFound } from "next/navigation";

import { UniversalMarketMonitor } from "@/components/universal-market-monitor";
import { getAssetMonitorDefinition } from "@/lib/asset-monitors";

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

  return <UniversalMarketMonitor initialAssetClass={assetClass} />;
}
