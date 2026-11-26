import type { RegionPrice } from "@wedding/core";

/**
 * 애플리케이션 계층이 기대하는 저장소 인터페이스 (Repository 패턴).
 * 구현은 infrastructure/repositories에 두고, container.ts에서 주입한다.
 */
export interface RegionPriceRepository {
  /** 모든 지역(전국 포함)·항목의 최신 조사 가격 */
  findAllLatest(): Promise<RegionPrice[]>;
}
