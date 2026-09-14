import { SettingsWorkspace } from "@/components/settings-workspace";
import { loadFinanceUsage } from "@/lib/finance-api";
import { authenticatedSessionToken } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authToken = await authenticatedSessionToken();
  let financeApiConnected = false;
  try {
    await loadFinanceUsage(authToken);
    financeApiConnected = true;
  } catch {
    financeApiConnected = false;
  }
  const externalAiEnabled = process.env.AI_EXTERNAL_CALLS_ENABLED === "true";
  return <SettingsWorkspace financeApiConnected={financeApiConnected} externalAiEnabled={externalAiEnabled} />;
}
