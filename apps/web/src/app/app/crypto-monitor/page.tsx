import { CryptoMonitorWorkspace } from "@/components/crypto-monitor-workspace";
import { loadCryptoMonitor } from "@/lib/crypto-monitor";

export const dynamic = "force-dynamic";

export default async function CryptoMonitorPage() {
  let initialPayload: Awaited<ReturnType<typeof loadCryptoMonitor>> | undefined;
  let initialError: string | undefined;

  try {
    initialPayload = await loadCryptoMonitor("4h", 20);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Crypto market data is temporarily unavailable.";
  }

  return <CryptoMonitorWorkspace initialPayload={initialPayload} initialError={initialError} />;
}
