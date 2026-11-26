// ponytail: 로그인·저장 기능이 생기기 전까지 이 기기 브라우저에만 저장한다. 그때 Supabase로 옮긴다.
// 저장 형식을 바꾸면 키 버전을 올린다. 옛 코드가 새 데이터를 지우지 않게.
// 읽은 값은 손상·변조될 수 있어 항상 core의 parse 함수로 검증한다.
import { isDateString, parseHallBoard, parseLedger, type HallBoard, type LedgerEntry, type SavedHall } from "@wedding/core";
import { SAMPLE_PHOTOS } from "./sample-photos";

export const LEDGER_KEY = "wedo-ledger-v1";
const HALLS_KEY = "wedo-halls-v1";
const WEDDING_DATE_KEY = "wedo-wedding-date-v1";

export const DEFAULT_HALL_BOARD: HallBoard = { region: "seoul-gangnam", guests: 200, halls: [] };

// 저장된 사진 주소는 우리가 넣은 예시 사진만 다시 보여 준다(next/image가 모르는 주소로 화면이 깨지지 않게).
const ALLOWED_PHOTOS: ReadonlySet<string> = new Set(Object.values(SAMPLE_PHOTOS));
const keepPhoto = (h: SavedHall): SavedHall => (h.photo && ALLOWED_PHOTOS.has(h.photo) ? h : { ...h, photo: null });

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드, 용량 초과)에서는 화면에만 유지한다.
  }
}

const serializeBoard = (board: HallBoard) => JSON.stringify({ ...board, halls: board.halls.map(keepPhoto) });

export function readHallBoard(): HallBoard {
  const board = parseHallBoard(readJson(HALLS_KEY));
  return board ? { ...board, halls: board.halls.map(keepPhoto) } : DEFAULT_HALL_BOARD;
}

/**
 * 이 기기에서 고른 사진(blob)은 새로고침하면 사라지므로 저장하지 않는다.
 * 덮기 전에, 지금 저장된 값이 검증에서 걸러지는 것이면 원본을 한 번 백업한다(첫 원본만 지킨다).
 */
export function writeHallBoard(board: HallBoard) {
  try {
    const raw = localStorage.getItem(HALLS_KEY);
    const parsed = parseHallBoard(readJson(HALLS_KEY));
    const backupKey = `${HALLS_KEY}-backup`;
    if (raw && (!parsed || serializeBoard(parsed) !== raw) && localStorage.getItem(backupKey) === null) {
      localStorage.setItem(backupKey, raw);
    }
  } catch {
    // 백업을 못 해도 사용자가 방금 한 입력은 저장한다.
  }
  write(HALLS_KEY, serializeBoard(board));
}

/** 홈 화면용 읽기 전용. 백업·복구는 비용 장부 화면이 맡는다. */
export function readLedger(): LedgerEntry[] {
  return parseLedger(readJson(LEDGER_KEY));
}

export function readWeddingDate(): string | null {
  try {
    const value = localStorage.getItem(WEDDING_DATE_KEY);
    return isDateString(value) ? value : null;
  } catch {
    return null;
  }
}

/** 빈 값이면 날짜를 지운다. */
export function writeWeddingDate(date: string) {
  if (date === "") {
    try {
      localStorage.removeItem(WEDDING_DATE_KEY);
    } catch {}
  } else if (isDateString(date)) write(WEDDING_DATE_KEY, date);
}

// 예시 데이터. 홀 이름은 가상이고 사진은 Unsplash 예시 사진이다.
export const EXAMPLE_HALLS: SavedHall[] = [
  { id: "ex-1", name: "라온홀", mealPerPerson: 95_000, rental: 7_000_000, guaranteedGuests: 250, photo: SAMPLE_PHOTOS.ballroom },
  { id: "ex-2", name: "채플 드 메이", mealPerPerson: 88_000, rental: 8_500_000, guaranteedGuests: 200, photo: SAMPLE_PHOTOS.flowerArch },
  { id: "ex-3", name: "가든 루체", mealPerPerson: 79_000, rental: 5_500_000, guaranteedGuests: 220, photo: SAMPLE_PHOTOS.garden },
  { id: "ex-4", name: "더 리안", mealPerPerson: 99_000, rental: 9_000_000, guaranteedGuests: 200, photo: SAMPLE_PHOTOS.hall },
  { id: "ex-5", name: "포레 웨딩", mealPerPerson: 85_000, rental: 6_000_000, guaranteedGuests: 180, photo: SAMPLE_PHOTOS.gazebo },
];
