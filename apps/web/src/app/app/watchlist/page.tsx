import { WatchlistWorkspace } from "@/components/watchlist-workspace";
import { loadRealProviderWatchlist } from "@/lib/finance-api";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  let payload: Awaited<ReturnType<typeof loadRealProviderWatchlist>> | null = null;
  let initialError: string | undefined;

  try {
    payload = await loadRealProviderWatchlist();
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
