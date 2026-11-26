import "server-only";
import {
  findRegion,
  isSmallSample,
  NATIONAL,
  PRICE_ITEM_LABELS,
  REGIONS,
  type PriceItem,
  type RegionCode,
  type RegionPrice,
} from "@wedding/core";
import type { RegionPriceRepository } from "./ports";

const ITEM_ORDER = Object.keys(PRICE_ITEM_LABELS) as PriceItem[];

function pick(prices: RegionPrice[], code: string, item: PriceItem) {
  return prices.find((price) => price.regionCode === code && price.item === item);
}

/** 지역 평균 화면에 넘기는 최소한의 데이터 (DTO) */
export interface RegionPriceSummaryDTO {
  regionName: string;
  items: {
    item: PriceItem;
    label: string;
    median: number | null;
    /** 지역 표본이 적어 참고만 해야 하는지 */
    smallSample: boolean;
    sampleCount: number | null;
    nationalMedian: number | null;
    basedOn: string | null;
  }[];
}

export async function getRegionPriceSummary(
  repository: RegionPriceRepository,
  regionCode: RegionCode,
): Promise<RegionPriceSummaryDTO> {
  const prices = await repository.findAllLatest();
  return {
    regionName: findRegion(regionCode).name,
    items: ITEM_ORDER.map((item) => {
      const regional = pick(prices, regionCode, item);
      return {
        item,
        label: PRICE_ITEM_LABELS[item],
        median: regional?.median ?? null,
        smallSample: regional ? isSmallSample(regional.sampleCount) : false,
        sampleCount: regional?.sampleCount ?? null,
        nationalMedian: pick(prices, NATIONAL, item)?.median ?? null,
        basedOn: regional?.basedOn ?? null,
      };
    }),
  };
}

/** 계산기 화면(견적·웨딩홀 비교)에 넘기는 지역별 중간값 */
export interface RegionMediansDTO {
  basedOn: string | null;
  regions: { code: RegionCode; name: string }[];
  /** 지역 코드 → 항목 → 중간값(원). 자료가 없는 항목은 빠진다. */
  medians: Partial<Record<RegionCode, Partial<Record<PriceItem, number>>>>;
}

export async function getRegionMedians(
  repository: RegionPriceRepository,
): Promise<RegionMediansDTO> {
  const prices = await repository.findAllLatest();
  const medians: RegionMediansDTO["medians"] = {};
  for (const price of prices) {
    if (price.regionCode === NATIONAL) continue;
    (medians[price.regionCode] ??= {})[price.item] = price.median;
  }
  return {
    basedOn: prices[0]?.basedOn ?? null,
    regions: REGIONS.map(({ code, name }) => ({ code, name })),
    medians,
  };
}
