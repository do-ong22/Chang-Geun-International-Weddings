import { isRegionCode, type RegionCode } from "./region.ts";

export interface HallQuote {
  mealPerPerson: number;
  rental: number;
  /** 보증 인원. 하객이 적어도 이만큼 식대를 낸다. */
  guaranteedGuests: number;
}

export interface HallCost {
  total: number;
  /** 보증 인원보다 하객이 적어서 내는 식대 */
  unusedGuaranteeCost: number;
}

export function calculateHallCost(hall: HallQuote, expectedGuests: number): HallCost {
  if (expectedGuests < 0 || hall.guaranteedGuests < 0) {
    throw new RangeError("guest count must not be negative");
  }
  if (hall.mealPerPerson < 0 || hall.rental < 0) {
    throw new RangeError("price must not be negative");
  }
  const billedGuests = Math.max(expectedGuests, hall.guaranteedGuests);
  const unusedGuests = Math.max(0, hall.guaranteedGuests - expectedGuests);
  return {
    total: hall.mealPerPerson * billedGuests + hall.rental,
    unusedGuaranteeCost: hall.mealPerPerson * unusedGuests,
  };
}

export const MAX_HALLS = 5;
/** 입력 상한. 화면 입력칸의 max와 같다. */
export const HALL_LIMITS = { mealPerPerson: 1_000_000, rental: 1_000_000_000, guests: 2000 } as const;

export interface SavedHall extends HallQuote {
  id: string;
  name: string;
  /** https 사진 주소. 이 기기에서만 보이는 사진(blob)은 저장하지 않는다. */
  photo: string | null;
}

/** 웨딩홀 비교 화면의 저장 단위: 지역·하객·후보 홀 */
export interface HallBoard {
  region: RegionCode;
  guests: number | null;
  halls: SavedHall[];
}

const isCount = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

/**
 * 저장소에서 읽은 비교 보드를 검증한다. 신뢰 경계에서 부른다.
 * 형태가 틀리면 null, 깨진 홀과 중복 id는 빼고 최대 5곳만 남긴다.
 */
export function parseHallBoard(raw: unknown): HallBoard | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.region !== "string" || !isRegionCode(b.region)) return null;
  const guests = b.guests === null ? null : isCount(b.guests, HALL_LIMITS.guests) ? b.guests : undefined;
  if (guests === undefined || !Array.isArray(b.halls)) return null;
  const halls: SavedHall[] = [];
  const seen = new Set<string>();
  for (const item of b.halls) {
    if (halls.length === MAX_HALLS) break;
    if (typeof item !== "object" || item === null) continue;
    const h = item as Record<string, unknown>;
    if (typeof h.id !== "string" || h.id.length === 0 || h.id.length > 100 || seen.has(h.id)) continue;
    if (typeof h.name !== "string" || h.name.trim() === "" || h.name.length > 40) continue;
    if (!isCount(h.mealPerPerson, HALL_LIMITS.mealPerPerson) || !isCount(h.rental, HALL_LIMITS.rental)) continue;
    if (!isCount(h.guaranteedGuests, HALL_LIMITS.guests)) continue;
    const photo = typeof h.photo === "string" && h.photo.startsWith("https://") && h.photo.length <= 500 ? h.photo : null;
    seen.add(h.id);
    halls.push({ id: h.id, name: h.name, mealPerPerson: h.mealPerPerson, rental: h.rental, guaranteedGuests: h.guaranteedGuests, photo });
  }
  return { region: b.region, guests, halls };
}
