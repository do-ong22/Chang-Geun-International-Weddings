// 한국소비자원 참가격 결혼서비스 통계의 14개 지역 구분 (price.go.kr, 2026-09 확인)
export const REGIONS = [
  { code: "seoul-gangnam", name: "서울 강남" },
  { code: "seoul-other", name: "서울 강남 외" },
  { code: "gyeonggi", name: "경기" },
  { code: "incheon", name: "인천" },
  { code: "busan", name: "부산" },
  { code: "daegu", name: "대구" },
  { code: "jeonnam-gwangju", name: "전남·광주" },
  { code: "daejeon", name: "대전" },
  { code: "ulsan", name: "울산" },
  { code: "gangwon", name: "강원" },
  { code: "chungcheong", name: "충청" },
  { code: "jeonbuk", name: "전북" },
  { code: "gyeongsang", name: "경상" },
  { code: "jeju", name: "제주" },
] as const;

export type Region = (typeof REGIONS)[number];
export type RegionCode = Region["code"];

/** 전국 평균은 지역이 아니라 비교 기준이라 따로 둔다. */
export const NATIONAL = "national";

export function isRegionCode(value: string): value is RegionCode {
  return REGIONS.some((region) => region.code === value);
}

export function findRegion(code: RegionCode): Region {
  // isRegionCode로 좁힌 값만 들어오므로 항상 찾는다.
  return REGIONS.find((region) => region.code === code)!;
}
