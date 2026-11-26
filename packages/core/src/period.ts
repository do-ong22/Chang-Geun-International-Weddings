/** 예식 월별 평균 총비용 (원) */
export interface PeriodPrice {
  /** 1~12 */
  month: number;
  averageTotal: number;
}

export interface PeriodSaving {
  current: PeriodPrice;
  cheapest: PeriodPrice;
  /** 가장 싼 달로 옮겼을 때 아끼는 금액. 이미 가장 싸면 0 */
  saving: number;
}

export function findPeriodSaving(
  weddingMonth: number,
  prices: readonly PeriodPrice[],
): PeriodSaving | null {
  const current = prices.find((price) => price.month === weddingMonth);
  if (!current) return null;
  const cheapest = prices.reduce((min, price) =>
    price.averageTotal < min.averageTotal ? price : min,
  );
  return { current, cheapest, saving: current.averageTotal - cheapest.averageTotal };
}
