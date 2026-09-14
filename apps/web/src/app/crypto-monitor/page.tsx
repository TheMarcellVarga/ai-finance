import { CryptoMonitorWorkspace } from "@/components/crypto-monitor-workspace";
import { loadCryptoMonitor } from "@/lib/crypto-monitor";

export const dynamic = "force-dynamic";

export default async function PublicCryptoMonitorPage() {
  let initialPayload: Awaited<ReturnType<typeof loadCryptoMonitor>> | undefined;
  let initialError: string | undefined;

  try {
    initialPayload = await loadCryptoMonitor("4h", 80);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "Crypto market data is temporarily unavailable.";
  }

  return (
    <main className="page-stage workspace-stage min-h-dvh px-3 py-5 text-white sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <CryptoMonitorWorkspace initialPayload={initialPayload} initialError={initialError} />
      </div>
    </main>
  );
}
