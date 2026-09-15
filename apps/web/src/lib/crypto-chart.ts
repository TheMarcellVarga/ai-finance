import type { CryptoCandle } from "@/lib/crypto-supertrend";
import type { CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
import type { VargaTrendAnalysisTimeframe } from "@/lib/varga-trend";

export type CryptoChartPayload = {
  data: {
    candles: CryptoCandle[];
    analysisCandles: Record<VargaTrendAnalysisTimeframe, CryptoCandle[]>;
    dailyCandles: CryptoCandle[];
    weeklyCandles: CryptoCandle[];
  };
  meta: {
    provider: string;
    interval: CryptoMonitorInterval;
    capturedAt: string;
    scope: "singapore_mas_dpt" | "global";
    analysis: {
      atrPeriod: number;
      atrMultiplier: number;
      parameterMode: "auto";
      atrPeriodMin: number;
      atrPeriodMax: number;
      autoMinimumTrades: number;
      autoMinimumWinRate: number;
      historyCoverage: "provider-bounded";
      execution: "next_candle_open";
      maxCandlesPerTimeframe: number;
    };
  };
};
