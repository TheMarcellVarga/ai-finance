export type AllocationChartInput = {
  label: string;
  weightBps: number;
  status: string;
};

export type AllocationChartDatum = AllocationChartInput & {
  colorIndex: number;
};

export type MovementChartInput = {
  ticker: string;
  dailyChangeBps?: number;
};

export function normalizeAllocationData(allocation: AllocationChartInput[], limit = 5): AllocationChartDatum[] {
  const positive = allocation.filter((item) => item.weightBps > 0);
  const visible = positive.slice(0, limit).map((item, index) => ({ ...item, colorIndex: index }));
  const remainder = positive.slice(limit).reduce((total, item) => total + item.weightBps, 0);

  if (remainder <= 0) {
    return visible;
  }

  return [
    ...visible,
    {
      label: "Other",
      weightBps: remainder,
      status: "ok",
      colorIndex: visible.length,
    },
  ];
}

export function totalWeightBps(items: Array<{ weightBps: number }>) {
  return items.reduce((total, item) => total + item.weightBps, 0);
}

export function movementScale(items: MovementChartInput[]) {
  return Math.max(...items.map((item) => Math.abs(item.dailyChangeBps ?? 0)), 1);
}

export function movementWidth(dailyChangeBps: number | undefined, scale: number) {
  if (dailyChangeBps == null) {
    return 0;
  }
  return Math.min((Math.abs(dailyChangeBps) / Math.max(scale, 1)) * 100, 100);
}
