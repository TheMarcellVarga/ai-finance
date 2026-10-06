export type FlipDirection = "bull" | "bear" | "both";
export type FlipCadence = "daily" | "weekly";

export type FlipDigestPreferences = {
  enabled: boolean;
  direction: FlipDirection;
  cadence: FlipCadence;
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

export type FlipDigestEntry = {
  assetClass: string;
  symbol: string;
  name: string;
  direction: "bull" | "bear";
  lastFlipAt: string;
  source: string;
  capturedAt: string;
  signalBasis: string;
};

export type FlipDigestNotification = {
  id: string;
  periodStart: string;
  periodEnd: string;
  direction: FlipDirection;
  cadence: FlipCadence;
  entries: FlipDigestEntry[];
  coverage: { scannedClasses: string[]; failedClasses: string[]; generatedAt: string };
  emailSentAt: string | null;
  emailEnabled: boolean;
  inAppVisible: boolean;
};
