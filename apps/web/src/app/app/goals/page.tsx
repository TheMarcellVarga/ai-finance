import { GoalPlannerWorkspace } from "@/components/goal-planner-workspace";
import { FinanceWorkspaceEmptyError, loadRealProviderPortfolio } from "@/lib/finance-api";
import { authenticatedSessionToken } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const authToken = await authenticatedSessionToken();
  let portfolio: Awaited<ReturnType<typeof loadRealProviderPortfolio>> | null = null;
  let initialError: string | undefined;
  try {
    portfolio = await loadRealProviderPortfolio(authToken);
  } catch (error) {
    if (!(error instanceof FinanceWorkspaceEmptyError)) {
      initialError = error instanceof Error ? error.message : "The portfolio snapshot is unavailable.";
    }
  }
  return <GoalPlannerWorkspace portfolio={portfolio?.data} initialError={initialError} />;
}
