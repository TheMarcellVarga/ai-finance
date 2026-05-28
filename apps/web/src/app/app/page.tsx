import { MarketShell } from "@/components/market-shell";
import { WorkspaceSection } from "@/components/workspace-section";

export default function AppOverviewPage() {
  return (
    <div className="space-y-8">
      <WorkspaceSection
        eyebrow="Workspace"
        title="Financial intelligence workspace"
        body="This shell connects portfolio, research, goals, risk, watchlist, settings, and billing surfaces for the local portfolio demo."
      />
      <MarketShell />
    </div>
  );
}
