import "server-only";
import type { RegionCode } from "@wedding/core";
import { getRegionMedians, getRegionPriceSummary } from "./application/region-price-summary";
import { SupabaseRegionPriceRepository } from "./infrastructure/repositories/supabase-region-price-repository";

// 화면은 이 파일에서만 가져온다. DTO 타입도 여기서 다시 내보낸다.
export type { RegionMediansDTO, RegionPriceSummaryDTO } from "./application/region-price-summary";

/**
 * 조립 지점 (Composition Root).
 * 화면(app)은 이 파일만 부르고, 어떤 저장소 구현을 쓰는지는 여기서만 안다.
 */
const regionPriceRepository = new SupabaseRegionPriceRepository();

export const regionPrices = {
  getSummary: (regionCode: RegionCode) =>
    getRegionPriceSummary(regionPriceRepository, regionCode),
  getMedians: () => getRegionMedians(regionPriceRepository),
};
