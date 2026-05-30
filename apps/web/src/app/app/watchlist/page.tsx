import { WatchlistWorkspace } from "@/components/watchlist-workspace";
import { loadRealProviderWatchlist } from "@/lib/finance-api";
import { authenticatedSessionToken } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const authToken = await authenticatedSessionToken();
  let payload: Awaited<ReturnType<typeof loadRealProviderWatchlist>> | null = null;
  let initialError: string | undefined;

  try {
    payload = await loadRealProviderWatchlist(authToken);
  } catch (error) {
    initialError = error instanceof Error ? error.message : "The watchlist feed is unavailable.";
  }

  return (
    <WatchlistWorkspace
      initialError={initialError}
      initialMeta={payload?.meta}
      initialWatchlist={payload?.data}
    />
  );
}
