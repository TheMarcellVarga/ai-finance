import type { CryptoCandle } from "@/lib/crypto-supertrend";
import type { CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";

export type CryptoChartPayload = {
  data: {
    candles: CryptoCandle[];
    dailyCandles: CryptoCandle[];
    weeklyCandles: CryptoCandle[];
  };
  meta: {
    provider: string;
    interval: CryptoMonitorInterval;
    capturedAt: string;
    scope: "singapore_mas_dpt" | "global";
  };
};
