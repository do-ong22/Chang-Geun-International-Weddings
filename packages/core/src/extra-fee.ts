import type { SdmItem } from "./price.ts";

export type FeeCategory = SdmItem | "hall";

/** 업종별로 자주 붙는 추가금 (예: 스튜디오 원본, 드레스 헬퍼비) */
export interface ExtraFee {
  id: string;
  category: FeeCategory;
  name: string;
  /** 대략적인 금액 (원) */
  typicalAmount: number;
}

export interface QuoteForFees {
  category: FeeCategory;
  baseAmount: number;
  /** 견적에 이미 포함된 추가금 항목 id */
  includedFeeIds: readonly string[];
}

export interface FinalPriceEstimate {
  baseAmount: number;
  /** 견적에 없어서 상담 때 확인해야 할 추가금 */
  unconfirmedFees: ExtraFee[];
  /** 확인 안 된 추가금이 모두 붙었을 때의 최대 예상 금액 */
  maxEstimatedTotal: number;
}

export function estimateFinalPrice(
  quote: QuoteForFees,
  fees: readonly ExtraFee[],
): FinalPriceEstimate {
  if (quote.baseAmount < 0 || fees.some((fee) => fee.typicalAmount < 0)) {
    throw new RangeError("amount must not be negative");
  }
  const included = new Set(quote.includedFeeIds);
  const unconfirmedFees = fees.filter(
    (fee) => fee.category === quote.category && !included.has(fee.id),
  );
  const maxEstimatedTotal =
    quote.baseAmount + unconfirmedFees.reduce((sum, fee) => sum + fee.typicalAmount, 0);
  return { baseAmount: quote.baseAmount, unconfirmedFees, maxEstimatedTotal };
}
