import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PriceItem, RegionPrice } from "@wedding/core";
import type { RegionPriceRepository } from "@/server/application/ports";
import { createPublicClient } from "../supabase/public-client";

interface RegionPriceRow {
  region_code: string;
  item: PriceItem;
  median: number;
  sample_count: number;
  based_on: string;
}

/** 새 조사 자료를 넣은 뒤 revalidateTag(REGION_PRICE_CACHE_TAG)로 캐시를 비운다. */
export const REGION_PRICE_CACHE_TAG = "region-price";

// 공개 조사 자료는 한 달에 한 번 바뀌고 전체가 100행 안팎이라 통째로 캐시한다.
// 클래스 메서드에는 "use cache"를 붙일 수 없어 모듈 함수로 캐시하고 저장소가 위임한다.
async function fetchAllLatest(): Promise<RegionPrice[]> {
  "use cache";
  cacheLife("days");
  cacheTag(REGION_PRICE_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("region_price")
    .select("region_code, item, median, sample_count, based_on")
    .order("based_on", { ascending: false })
    .overrideTypes<RegionPriceRow[], { merge: false }>();

  if (error) throw new Error(`지역 가격 조회 실패: ${error.message}`);

  // 최신 시점이 먼저 오므로 (지역, 항목)별 첫 행만 남긴다.
  const latest = new Map<string, RegionPrice>();
  for (const row of data) {
    const key = `${row.region_code}:${row.item}`;
    if (!latest.has(key)) {
      latest.set(key, {
        regionCode: row.region_code as RegionPrice["regionCode"],
        item: row.item,
        median: row.median,
        sampleCount: row.sample_count,
        basedOn: row.based_on,
      });
    }
  }
  return [...latest.values()];
}

export class SupabaseRegionPriceRepository implements RegionPriceRepository {
  findAllLatest() {
    return fetchAllLatest();
  }
}
