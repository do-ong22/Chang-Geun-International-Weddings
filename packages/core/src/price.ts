import type { RegionCode, NATIONAL } from "./region.ts";

/** 스드메 항목 */
export type SdmItem = "studio" | "dress" | "makeup";
/** 웨딩홀은 총액이 아니라 1인당 식대와 대관료로 나눠 비교한다. */
export type HallItem = "hall_meal_per_person" | "hall_rental";
export type PriceItem = SdmItem | HallItem;

export const PRICE_ITEM_LABELS: Record<PriceItem, string> = {
  studio: "스튜디오",
  dress: "드레스",
  makeup: "메이크업",
  hall_meal_per_person: "1인당 식대",
  hall_rental: "대관료",
};

/** 공개 조사 자료의 지역별 중간값. 금액 단위는 원. */
export interface RegionPrice {
  regionCode: RegionCode | typeof NATIONAL;
  item: PriceItem;
  median: number;
  /** 조사 표본 수 */
  sampleCount: number;
  /** 조사 기준 시점 (YYYY-MM) */
  basedOn: string;
}

// ponytail: 표본 30건 미만이면 "참고만" 표시. 기준은 통계 관례값이고 필요하면 조정한다.
export const MIN_RELIABLE_SAMPLES = 30;

export function isSmallSample(sampleCount: number): boolean {
  return sampleCount < MIN_RELIABLE_SAMPLES;
}

export type PriceLevel = "below" | "similar" | "above";

export interface PriceComparison {
  /** 견적 - 중간값 (원) */
  diff: number;
  /** 중간값 대비 차이 비율. 0.2 = 20% 비쌈 */
  ratio: number;
  level: PriceLevel;
}

// ponytail: ±5% 이내는 "비슷함". 사용자 반응을 보고 조정한다.
const SIMILAR_RANGE = 0.05;

export function compareToMedian(amount: number, median: number): PriceComparison {
  if (median <= 0) throw new RangeError("median must be positive");
  if (amount < 0) throw new RangeError("amount must not be negative");
  const diff = amount - median;
  const ratio = diff / median;
  const level: PriceLevel =
    Math.abs(ratio) <= SIMILAR_RANGE ? "similar" : ratio > 0 ? "above" : "below";
  return { diff, ratio, level };
}
