import { MarketShell } from "@/components/market-shell";
import { WorkspaceSection } from "@/components/workspace-section";

export default function AppOverviewPage() {
  return (
    <div className="space-y-8">
      <WorkspaceSection
        eyebrow="Workspace"
        title="Authenticated app shell scaffold"
        body="This route establishes the responsive workspace shell. Clerk, portfolio data, and AI streaming are intentionally deferred to later roadmap phases."
      />
      <MarketShell />
    </div>
  );
}
