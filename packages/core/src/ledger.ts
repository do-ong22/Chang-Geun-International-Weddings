/**
 * 비용 장부: 항목별 예산 vs 실제 계약, 낸 돈과 남은 잔금.
 * 실제 결혼 준비 예산표의 구조(예산·계약금액·예약금·중도금·잔금·잔금일·진행상황)를 따른다.
 */

/** 장부 묶음 기본값 (실제 준비 기록의 분류) */
export const LEDGER_GROUPS = ["인사·상견례", "본식", "웨딩촬영", "예물·예복", "신혼여행", "신혼집", "기타"] as const;

export type LedgerStatus = "searching" | "reserved" | "paid";

export const LEDGER_STATUS_LABELS: Record<LedgerStatus, string> = {
  searching: "알아보는 중",
  reserved: "예약 완료",
  paid: "결제 완료",
};

export interface Payment {
  label: string;
  amount: number;
  /** YYYY-MM-DD. 정해지지 않았으면 null */
  dueDate: string | null;
  done: boolean;
}

export interface LedgerEntry {
  id: string;
  /** 묶음 (예: 본식, 웨딩촬영, 인사) */
  group: string;
  name: string;
  budget: number;
  /** 계약 전이면 null */
  contractAmount: number | null;
  payments: readonly Payment[];
  status: LedgerStatus;
}

export interface UpcomingPayment {
  entryId: string;
  paymentIndex: number;
  entryName: string;
  label: string;
  amount: number;
  dueDate: string;
}

export interface LedgerSummary {
  budgetTotal: number;
  /** 계약한 항목은 계약금액, 아직이면 예산으로 잡은 예상 총비용 */
  expectedTotal: number;
  paidTotal: number;
  /** 계약했지만 아직 안 낸 돈 */
  remainingTotal: number;
  /** 계약금액이 예산을 넘은 항목 */
  overBudget: { entryId: string; name: string; over: number }[];
  /** 아직 안 낸 결제 중 날짜가 있는 것, 가까운 순 */
  upcoming: UpcomingPayment[];
}

function assertAmount(value: number, what: string) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${what} must be a non-negative number`);
}

export function summarizeLedger(entries: readonly LedgerEntry[]): LedgerSummary {
  let budgetTotal = 0;
  let expectedTotal = 0;
  let paidTotal = 0;
  let remainingTotal = 0;
  const overBudget: LedgerSummary["overBudget"] = [];
  const upcoming: UpcomingPayment[] = [];

  for (const entry of entries) {
    assertAmount(entry.budget, "budget");
    if (entry.contractAmount !== null) assertAmount(entry.contractAmount, "contractAmount");

    budgetTotal += entry.budget;
    expectedTotal += entry.contractAmount ?? entry.budget;

    const paid = entry.payments.reduce((sum, p) => {
      assertAmount(p.amount, "payment");
      return p.done ? sum + p.amount : sum;
    }, 0);
    paidTotal += paid;

    if (entry.contractAmount !== null) {
      remainingTotal += Math.max(0, entry.contractAmount - paid);
      if (entry.contractAmount > entry.budget) {
        overBudget.push({ entryId: entry.id, name: entry.name, over: entry.contractAmount - entry.budget });
      }
    }

    entry.payments.forEach((p, paymentIndex) => {
      if (!p.done && p.dueDate) {
        upcoming.push({ entryId: entry.id, paymentIndex, entryName: entry.name, label: p.label, amount: p.amount, dueDate: p.dueDate });
      }
    });
  }

  // YYYY-MM-DD는 문자열 비교가 날짜 순서와 같다.
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { budgetTotal, expectedTotal, paidTotal, remainingTotal, overBudget, upcoming };
}

/** 오늘(YYYY-MM-DD) 기준 남은 일수. 지났으면 음수 */
export function daysUntil(dueDate: string, today: string): number {
  const ms = Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// 1조 원: 결혼 비용으로 나올 수 없는 값을 막아 합계가 Infinity가 되지 않게 한다.
const MAX_AMOUNT = 1_000_000_000_000;
const isAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_AMOUNT;
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
/** 형식뿐 아니라 실제로 있는 날짜인지(2026-02-31 거부) */
export function isDateString(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_PATTERN.test(v)) return false;
  const time = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === v;
}

/**
 * 저장소(브라우저·서버)에서 읽은 값을 장부로 검증한다. 신뢰 경계에서 부른다.
 * 형태가 틀린 항목과 중복 id는 버리고, 깨진 결제는 그 결제만 뺀다. 모르는 분류는 "기타"로 바꾼다.
 * 화면이 깨지지 않는 것이 우선이다.
 */
export function parseLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const statuses = Object.keys(LEDGER_STATUS_LABELS);
  const entries: LedgerEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const e = item as Record<string, unknown>;
    if (!isText(e.id, 100) || seen.has(e.id) || !isText(e.name, 40) || !isAmount(e.budget)) continue;
    if (e.contractAmount !== null && !isAmount(e.contractAmount)) continue;
    if (typeof e.status !== "string" || !statuses.includes(e.status)) continue;
    if (!Array.isArray(e.payments)) continue;
    const payments: Payment[] = [];
    for (const p of e.payments as unknown[]) {
      const q = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
      const dueOk = q.dueDate === null || isDateString(q.dueDate);
      // 깨진 결제 하나 때문에 계약 정보까지 잃지 않도록 그 결제만 뺀다.
      if (!isText(q.label, 20) || !isAmount(q.amount) || !dueOk || typeof q.done !== "boolean") continue;
      payments.push({ label: q.label, amount: q.amount, dueDate: q.dueDate as string | null, done: q.done });
    }
    seen.add(e.id);
    const group = (LEDGER_GROUPS as readonly unknown[]).includes(e.group) ? (e.group as string) : "기타";
    entries.push({
      id: e.id,
      group,
      name: e.name,
      budget: e.budget,
      contractAmount: e.contractAmount as number | null,
      payments,
      status: e.status as LedgerStatus,
    });
  }
  return entries;
}
