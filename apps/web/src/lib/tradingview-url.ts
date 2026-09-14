export function getTradingViewChartUrl(symbol: string) {
  const url = new URL("https://www.tradingview.com/chart/");
  url.searchParams.set("symbol", symbol);
  return url.toString();
}
