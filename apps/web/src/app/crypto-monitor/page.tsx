import { CryptoMonitorWorkspace } from "@/components/crypto-monitor-workspace";

export const dynamic = "force-dynamic";

export default function PublicCryptoMonitorPage() {
  return (
    <main className="page-stage workspace-stage min-h-dvh px-3 py-5 text-white sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <CryptoMonitorWorkspace />
      </div>
    </main>
  );
}
