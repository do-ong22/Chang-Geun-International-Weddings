"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  daysUntil,
  formatManwon,
  formatWon,
  LEDGER_GROUPS,
  LEDGER_STATUS_LABELS,
  parseLedger,
  summarizeLedger,
  type LedgerEntry,
  type LedgerStatus,
} from "@wedding/core";
import { AmountInput, MAX_MANWON } from "@/components/manwon-input";
import { SectionTitle, StatHeader, buttonPrimary } from "@/components/ui";
import { LEDGER_KEY } from "@/lib/local-store";

const MANWON = 10_000;
// 저장 위치와 키 규칙은 lib/local-store.ts에 있다.
const STORAGE_KEY = LEDGER_KEY;
const BACKUP_KEY = `${STORAGE_KEY}-backup`;

// 예시 데이터: 실제 사용자 기록이 아닌 일반적인 금액
// parseLedger로 감싸 키 순서를 저장 형식과 맞춘다. 순서가 다르면 load()가 정상 데이터를 "변경됨"으로 보고 백업 칸을 차지한다.
const EXAMPLE: LedgerEntry[] = parseLedger([
  {
    id: "ex-hall", group: "본식", name: "웨딩홀", budget: 20_000_000, contractAmount: 21_000_000, status: "reserved",
    payments: [
      { label: "예약금", amount: 2_000_000, dueDate: "2026-06-01", done: true },
      { label: "잔금", amount: 19_000_000, dueDate: "2027-05-01", done: false },
    ],
  },
  {
    id: "ex-snap", group: "본식", name: "본식 스냅", budget: 600_000, contractAmount: 500_000, status: "reserved",
    payments: [
      { label: "예약금", amount: 100_000, dueDate: "2026-07-01", done: true },
      { label: "잔금", amount: 400_000, dueDate: "2027-05-01", done: false },
    ],
  },
  {
    id: "ex-studio", group: "웨딩촬영", name: "스튜디오 촬영", budget: 1_500_000, contractAmount: 1_600_000, status: "reserved",
    payments: [
      { label: "예약금", amount: 300_000, dueDate: "2026-08-01", done: true },
      { label: "잔금", amount: 1_300_000, dueDate: "2027-01-15", done: false },
    ],
  },
  { id: "ex-hanbok", group: "본식", name: "혼주 한복", budget: 1_000_000, contractAmount: null, status: "searching", payments: [] },
  {
    id: "ex-meet", group: "인사·상견례", name: "상견례 식사", budget: 800_000, contractAmount: 700_000, status: "paid",
    payments: [{ label: "결제", amount: 700_000, dueDate: "2026-05-01", done: true }],
  },
]);

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // 저장소 값은 손상·변조될 수 있어 core에서 검증한다.
    let data: unknown = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // 아래에서 백업하고 빈 장부로 시작한다.
    }
    const entries = parseLedger(data);
    // 검증에서 바뀐 것이 있으면(항목·결제가 빠지거나 분류가 바뀜) 원본을 남긴다.
    // 백업은 한 칸이라 처음 것만 지킨다. 키 순서 차이로 비교가 잘못 판정돼도 첫 원본을 덮지 않는다.
    if (JSON.stringify(entries) !== raw && localStorage.getItem(BACKUP_KEY) === null) {
      try {
        localStorage.setItem(BACKUP_KEY, raw);
      } catch {
        // 백업이 안 돼도 원본은 사용자가 처음 고칠 때까지 그대로 둔다(아래 저장 effect).
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export function Ledger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  // 불러온 직후에는 저장하지 않는다. 검증으로 걸러진 값이 원본을 덮지 않게, 사용자가 고친 뒤부터 쓴다.
  const skipSave = useRef(true);

  // 브라우저 저장소와 오늘 날짜는 클라이언트에서만 읽는다(서버 렌더와 어긋나지 않게).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 외부 저장소에서 한 번 불러오는 초기화 */
    setEntries(load());
    setToday(todayLocal());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 화면에만 유지한다.
    }
  }, [entries, loaded]);

  const summary = summarizeLedger(entries);
  const groups = LEDGER_GROUPS.filter((g) => entries.some((e) => e.group === g));

  function togglePayment(entryId: string, index: number) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== entryId ? e : { ...e, payments: e.payments.map((p, i) => (i === index ? { ...p, done: !p.done } : p)) },
      ),
    );
  }

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_380px] md:items-start md:gap-10 md:px-5">
      <div className="md:col-start-2 md:row-start-1 md:rounded-[24px] md:border md:border-line md:pt-4">
        <StatHeader
          label="남은 잔금"
          value={entries.length ? formatWon(summary.remainingTotal) : "—"}
          tone={entries.length ? "default" : "muted"}
          sub={entries.length ? `예상 총비용 ${formatManwon(summary.expectedTotal)} · 예산 ${formatManwon(summary.budgetTotal)}` : "항목 없음"}
        />
        {entries.length > 0 && (
          <dl className="grid grid-cols-2 gap-3 px-5 pb-6">
            <Tile label="낸 돈" value={formatManwon(summary.paidTotal)} />
            <Tile
              label="예산 대비"
              value={`${summary.expectedTotal >= summary.budgetTotal ? "+" : "−"}${formatManwon(summary.expectedTotal - summary.budgetTotal)}`}
              tone={summary.expectedTotal > summary.budgetTotal ? "up" : "down"}
            />
          </dl>
        )}
        {summary.upcoming.length > 0 && today && (
          <section className="px-5 pb-6">
            <SectionTitle>다가오는 결제</SectionTitle>
            <ul className="divide-y divide-line">
              {summary.upcoming.slice(0, 5).map((p) => {
                const d = daysUntil(p.dueDate, today);
                return (
                  <li key={`${p.entryId}-${p.paymentIndex}`} className="flex items-center gap-3 py-3 tabular">
                    <span className={`w-14 text-[13px] font-bold ${d < 0 ? "text-up" : d <= 30 ? "text-warn" : "text-ink-2"}`}>
                      {d < 0 ? `${-d}일 지남` : d === 0 ? "오늘" : `D-${d}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {p.entryName} {p.label}
                    </span>
                    <span className="text-[15px] font-semibold">{formatWon(p.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="md:col-start-1 md:row-start-1">
        <div className="flex items-center justify-between px-5 pt-2 md:px-0">
          <SectionTitle>항목</SectionTitle>
          {loaded && entries.length === 0 && (
            <button
              type="button"
              onClick={() => setEntries(EXAMPLE)}
              className="mb-3 h-11 rounded-lg px-2 text-[14px] font-semibold text-brand hover:bg-brand-tint"
            >
              예시 입력
            </button>
          )}
        </div>

        {groups.map((group) => (
          <section key={group} className="px-5 pb-6 md:px-0">
            <h3 className="mb-2 text-[14px] font-semibold text-ink-2">{group}</h3>
            <ul className="space-y-3">
              {entries
                .filter((e) => e.group === group)
                .map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onTogglePayment={(i) => togglePayment(entry.id, i)}
                    onRemove={() => setEntries((prev) => prev.filter((e) => e.id !== entry.id))}
                  />
                ))}
            </ul>
          </section>
        ))}

        <AddEntryForm onAdd={(entry) => setEntries((prev) => [...prev, entry])} />
        <p className="px-5 pb-8 text-[12px] text-ink-3 md:px-0">이 기기 브라우저에만 저장됩니다.</p>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-2xl bg-fill-2 p-4">
      <dt className="text-[13px] font-medium text-ink-2">{label}</dt>
      <dd className={`mt-1 text-[19px] font-bold tabular ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function EntryCard({
  entry,
  onTogglePayment,
  onRemove,
}: {
  entry: LedgerEntry;
  onTogglePayment: (index: number) => void;
  onRemove: () => void;
}) {
  const over = entry.contractAmount !== null ? entry.contractAmount - entry.budget : null;
  return (
    <li className="rounded-[20px] border border-line p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold">{entry.name}</p>
          <p className="text-[13px] text-ink-2 tabular">
            예산 {formatWon(entry.budget)}
            {entry.contractAmount !== null && <> · 계약 {formatWon(entry.contractAmount)}</>}
            {over !== null && over > 0 && <span className="font-semibold text-up"> (+{formatManwon(over)})</span>}
          </p>
        </div>
        <span className="rounded-full bg-fill px-2 py-0.5 text-[12px] font-semibold text-ink-2">
          {LEDGER_STATUS_LABELS[entry.status]}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${entry.name} 삭제`}
          className="-mt-2 -mr-2 grid h-11 w-11 place-items-center rounded-full text-ink-3 hover:bg-fill"
        >
          <Trash2 aria-hidden size={18} />
        </button>
      </div>
      {entry.payments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.payments.map((p, i) => (
            <li key={`${p.label}-${i}`}>
              <button
                type="button"
                role="checkbox"
                aria-checked={p.done}
                onClick={() => onTogglePayment(i)}
                className="flex min-h-11 w-full items-center gap-3 text-left tabular"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                    p.done ? "border-brand bg-brand text-white" : "border-ink-4"
                  }`}
                >
                  {p.done && <Check aria-hidden size={14} strokeWidth={3} />}
                </span>
                <span className="text-[14px] font-medium">{p.label}</span>
                <span className="text-[13px] text-ink-3">{p.dueDate ?? "날짜 미정"}</span>
                <span className={`ml-auto text-[14px] font-semibold ${p.done ? "text-ink-3 line-through" : ""}`}>
                  {formatWon(p.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function AddEntryForm({ onAdd }: { onAdd: (entry: LedgerEntry) => void }) {
  const [group, setGroup] = useState<string>(LEDGER_GROUPS[1]);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState<number | null>(null);
  const [contract, setContract] = useState<number | null>(null);
  const [deposit, setDeposit] = useState<number | null>(null);
  const [balanceDate, setBalanceDate] = useState("");

  const valid = name.trim() !== "" && budget !== null;

  function submit() {
    if (name.trim() === "" || budget === null) return;
    const contractAmount = contract === null ? null : contract * MANWON;
    // 예약금 칸은 계약 금액이 있을 때만 보이고, 상한도 계약 금액이다.
    const depositAmount = contractAmount === null || deposit === null ? 0 : Math.min(deposit * MANWON, contractAmount);
    const balance = contractAmount === null ? 0 : contractAmount - depositAmount;
    const payments =
      contractAmount === null
        ? []
        : [
            ...(depositAmount > 0 ? [{ label: "예약금", amount: depositAmount, dueDate: null, done: true }] : []),
            ...(balance > 0 ? [{ label: "잔금", amount: balance, dueDate: balanceDate || null, done: false }] : []),
          ];
    const status: LedgerStatus = contractAmount === null ? "searching" : balance === 0 ? "paid" : "reserved";
    onAdd({
      id: crypto.randomUUID(),
      group,
      name: name.trim().slice(0, 40),
      budget: budget * MANWON,
      contractAmount,
      payments,
      status,
    });
    setName("");
    setBudget(null);
    setContract(null);
    setDeposit(null);
    setBalanceDate("");
  }

  return (
    <section className="mx-5 mb-4 rounded-[20px] bg-fill-2 p-5 md:mx-0">
      <SectionTitle>항목 추가</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ledger-group" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            분류
          </label>
          <select
            id="ledger-group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="h-12 w-full rounded-xl bg-white px-3 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-brand"
          >
            {LEDGER_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ledger-name" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            항목
          </label>
          <input
            id="ledger-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 본식 스냅"
            className="h-12 w-full rounded-xl bg-white px-3 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-ink-2 focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="ledger-budget" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            예산
          </label>
          <AmountInput id="ledger-budget" value={budget} onChange={setBudget} unit="만 원" max={MAX_MANWON} />
        </div>
        <div>
          <label htmlFor="ledger-contract" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            계약 금액 (계약 전이면 비움)
          </label>
          <AmountInput id="ledger-contract" value={contract} onChange={setContract} unit="만 원" max={MAX_MANWON} />
        </div>
        {/* 계약 전에는 예약금·잔금이 없으므로 계약 금액을 넣어야 보인다 */}
        {contract !== null && (
          <>
            <div>
              <label htmlFor="ledger-deposit" className="mb-1.5 block text-[13px] font-medium text-ink-2">
                낸 예약금
              </label>
              <AmountInput id="ledger-deposit" value={deposit} onChange={setDeposit} unit="만 원" max={contract} />
            </div>
            <div>
              <label htmlFor="ledger-date" className="mb-1.5 block text-[13px] font-medium text-ink-2">
                잔금일
              </label>
              <input
                id="ledger-date"
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                className="h-12 w-full rounded-xl bg-white px-3 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </>
        )}
      </div>
      <button type="button" disabled={!valid} onClick={submit} className={`${buttonPrimary} mt-4`}>
        장부에 넣기
      </button>
    </section>
  );
}
