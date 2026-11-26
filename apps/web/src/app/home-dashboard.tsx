"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Landmark, Plus } from "lucide-react";
import {
  calculateHallCost,
  compareToMedian,
  daysUntil,
  formatManwon,
  formatPercent,
  formatWon,
  MAX_HALLS,
  summarizeLedger,
  type HallBoard,
  type LedgerEntry,
  type PriceComparison,
} from "@wedding/core";
import type { RegionMediansDTO } from "@/server/container";
import {
  DEFAULT_HALL_BOARD,
  EXAMPLE_HALLS,
  readHallBoard,
  readLedger,
  readWeddingDate,
  writeHallBoard,
  writeWeddingDate,
} from "@/lib/local-store";

type SortKey = "total" | "meal" | "rental";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "total", label: "총액" },
  { key: "meal", label: "식대" },
  { key: "rental", label: "대관" },
];

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dday = (days: number) => (days > 0 ? `D-${days}` : days === 0 ? "D-day" : `D+${-days}`);

/** 홈: 후보 홀 총액 비교가 주인공, 결혼식 날짜와 다가오는 결제는 옆 레일 */
export function HomeDashboard({ data }: { data: RegionMediansDTO }) {
  const [board, setBoard] = useState<HallBoard>(DEFAULT_HALL_BOARD);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("total");

  // 브라우저 저장소와 오늘 날짜는 클라이언트에서만 읽는다(서버 렌더와 어긋나지 않게).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- 외부 저장소에서 한 번 불러오는 초기화 */
    setBoard(readHallBoard());
    setLedger(readLedger());
    setWeddingDate(readWeddingDate());
    setToday(todayLocal());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const loaded = today !== null;
  const guests = board.guests ?? 0;
  const medianMeal = data.medians[board.region]?.hall_meal_per_person;
  const medianRental = data.medians[board.region]?.hall_rental;
  const medianTotal = medianMeal && medianRental && guests > 0 ? medianMeal * guests + medianRental : null;
  const regionName = data.regions.find((r) => r.code === board.region)?.name ?? "";

  // 하객 수가 비어 있으면 /halls처럼 순위를 보여 주지 않는다(0명 기준 총액은 오해를 부른다).
  const rows = (board.guests === null ? [] : board.halls)
    .map((hall) => {
      const total = calculateHallCost(hall, guests).total;
      return { hall, total, vs: medianTotal ? compareToMedian(total, medianTotal) : null };
    })
    .sort((a, b) =>
      sort === "meal" ? a.hall.mealPerPerson - b.hall.mealPerPerson : sort === "rental" ? a.hall.rental - b.hall.rental : a.total - b.total,
    );
  const scale = Math.max(medianTotal ?? 0, ...rows.map((r) => r.total)) * 1.02 || 1;

  const summary = summarizeLedger(ledger);
  const upcoming = summary.upcoming.slice(0, 3);
  const nextPay = upcoming[0];
  const daysLeft = weddingDate && today ? daysUntil(weddingDate, today) : null;

  function showExample() {
    const next = { ...board, halls: EXAMPLE_HALLS };
    writeHallBoard(next);
    setBoard(next);
  }

  function changeDate(value: string) {
    writeWeddingDate(value);
    setWeddingDate(readWeddingDate());
  }

  return (
    <div className="px-5 md:pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      {/* 휴대폰: 맨 위 숫자 한 줄. PC는 오른쪽 레일이 같은 내용을 보여 준다 */}
      <dl className="grid grid-cols-3 gap-2 pb-6 tabular lg:hidden">
        <Stat label="결혼식" value={daysLeft === null ? "—" : dday(daysLeft)} />
        <Stat label="남은 잔금" value={loaded && ledger.length ? formatManwon(summary.remainingTotal).replace(" 원", "") : "—"} />
        <Stat
          label="다음 결제"
          value={nextPay && today ? dday(daysUntil(nextPay.dueDate, today)) : "—"}
          tone={nextPay && today && daysUntil(nextPay.dueDate, today) <= 14 ? "up" : undefined}
        />
      </dl>

      <section aria-labelledby="halls-title" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="halls-title" className="text-[20px] font-bold tracking-[-0.02em]">
            후보 홀 <span className="tabular">{loaded ? board.halls.length : "-"}</span>
            <span className="text-[15px] font-semibold text-ink-3">/{MAX_HALLS}</span>
          </h2>
          {rows.length >= 2 && (
            <div role="group" aria-label="정렬" className="flex gap-0.5 rounded-[10px] bg-fill p-[3px]">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sort === s.key}
                  onClick={() => setSort(s.key)}
                  className="h-9 rounded-lg px-3 text-[13px] font-semibold text-ink-3 aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-sm"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {loaded && (
          <p className="mt-1 text-[13px] text-ink-3 tabular">
            {board.guests === null ? "예상 하객 미입력" : `하객 ${guests.toLocaleString("ko-KR")}명`} · {regionName}
            {medianTotal && <> 기준 {formatManwon(medianTotal)}</>}
          </p>
        )}

        {!loaded ? (
          <div className="mt-4 h-[360px] animate-pulse rounded-[20px] bg-fill" />
        ) : board.halls.length > 0 && board.guests === null ? (
          <Link href="/halls" className="mt-4 flex h-12 items-center justify-center gap-1 rounded-xl bg-fill text-[15px] font-semibold">
            예상 하객 입력 <ChevronRight aria-hidden size={16} />
          </Link>
        ) : rows.length === 0 ? (
          <EmptyHalls onExample={showExample} />
        ) : (
          <>
            {/* 휴대폰: 세로 목록, 막대의 검은 선이 지역 기준 */}
            <ol className="mt-4 grid gap-3 tabular lg:hidden">
              {rows.map(({ hall, total, vs }, i) => (
                <li key={hall.id}>
                  <Link href="/halls" className="grid grid-cols-[84px_1fr] items-center gap-3">
                    <Photo src={hall.photo} sizes="84px" className="h-[84px] w-[84px]" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <Rank n={i + 1} />
                        <span className="truncate font-semibold">{hall.name}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="text-[20px] font-bold tracking-[-0.02em]">{formatManwon(total).replace(" 원", "")}</span>
                        {vs && <VsChip vs={vs} />}
                      </span>
                      <Meter value={total} median={medianTotal} scale={scale} vs={vs} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            {/* PC: 홀이 열인 비교표 */}
            <div className="mt-4 hidden overflow-hidden rounded-[20px] border border-line lg:block">
              <table className="w-full table-fixed border-collapse text-[14px] tabular">
                <caption className="sr-only">후보 홀 비교, {SORTS.find((s) => s.key === sort)?.label} 순</caption>
                <thead>
                  <tr>
                    <td className="w-[112px]" />
                    {rows.map(({ hall }, i) => (
                      <th key={hall.id} scope="col" className={`p-3 pb-2 text-left align-top ${i === 0 ? "bg-brand-tint" : ""}`}>
                        <Link href="/halls" className="block">
                          <Photo src={hall.photo} sizes="200px" className="aspect-[4/3] w-full" />
                          <span className="mt-2 flex items-center gap-1.5">
                            <Rank n={i + 1} />
                            <span className="truncate font-semibold">{hall.name}</span>
                          </span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <BoardRow label="1인 식대" rows={rows} render={(r) => formatWon(r.hall.mealPerPerson)} />
                  <BoardRow label="대관" rows={rows} render={(r) => formatManwon(r.hall.rental)} />
                  <BoardRow label="보증 인원" rows={rows} render={(r) => `${r.hall.guaranteedGuests.toLocaleString("ko-KR")}명`} />
                  <BoardRow
                    label="총액"
                    rows={rows}
                    render={(r) => <span className="text-[18px] font-bold">{formatManwon(r.total)}</span>}
                  />
                  {medianTotal && (
                    <BoardRow label="지역 기준" rows={rows} render={(r) => (r.vs ? <VsChip vs={r.vs} /> : "—")} />
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <aside className="mt-8 grid gap-3 lg:sticky lg:top-20 lg:mt-0">
        <section className={`rounded-[20px] bg-fill-2 p-5 ${weddingDate ? "hidden lg:block" : ""}`}>
          <p className="text-[13px] font-semibold text-ink-3">결혼식</p>
          <p className="text-[28px] font-extrabold tracking-[-0.03em] tabular">{daysLeft === null ? "—" : dday(daysLeft)}</p>
          <label htmlFor="wedding-date" className="sr-only">
            결혼식 날짜
          </label>
          <input
            id="wedding-date"
            type="date"
            min="2000-01-01"
            max="9999-12-31"
            value={weddingDate ?? ""}
            onChange={(e) => changeDate(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl bg-white px-3 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-brand"
          />
        </section>

        <section className="rounded-[20px] border border-line p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">다가오는 결제</h2>
            <Link href="/budget" className="flex h-11 items-center text-[13px] font-semibold text-ink-3">
              장부 <ChevronRight aria-hidden size={16} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Link href="/budget" className="flex h-12 items-center gap-2 text-[15px] font-semibold text-brand">
              <Plus aria-hidden size={18} /> 잔금 일정 추가
            </Link>
          ) : (
            <ul className="tabular">
              {upcoming.map((p) => {
                const days = today ? daysUntil(p.dueDate, today) : null;
                return (
                  <li key={`${p.entryId}-${p.paymentIndex}`} className="flex min-h-12 items-center gap-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[12px] font-bold ${days !== null && days <= 14 ? "bg-up-tint text-up-ink" : "bg-fill text-ink-2"}`}
                    >
                      {days === null ? p.dueDate : dday(days)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {p.entryName} {p.label}
                    </span>
                    <span className="font-bold">{formatManwon(p.amount).replace(" 원", "")}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {ledger.length > 0 && (
            <p className="mt-2 border-t border-line pt-3 text-[13px] text-ink-3 tabular">
              남은 잔금 <span className="font-semibold text-ink">{formatWon(summary.remainingTotal)}</span>
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div className="rounded-2xl bg-fill-2 px-3.5 py-3">
      <dt className="text-[13px] font-semibold text-ink-3">{label}</dt>
      <dd className={`text-[18px] font-bold tracking-[-0.02em] ${tone === "up" ? "text-up" : ""}`}>{value}</dd>
    </div>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <span
      className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] text-[12px] font-extrabold ${n === 1 ? "bg-ink text-white" : "bg-fill text-ink-2"}`}
    >
      {n}
    </span>
  );
}

const VS_STYLE = { above: "bg-up-tint text-up-ink", similar: "bg-fill text-ink-2", below: "bg-down-tint text-down-ink" } as const;

function VsChip({ vs }: { vs: PriceComparison }) {
  return (
    <span className={`inline-flex h-[22px] items-center rounded-md px-2 text-[12px] font-bold ${VS_STYLE[vs.level]}`}>
      <span className="sr-only">지역 기준 대비 </span>
      {formatPercent(vs.ratio)}
    </span>
  );
}

function Meter({ value, median, scale, vs }: { value: number; median: number | null; scale: number; vs: PriceComparison | null }) {
  const color = vs?.level === "below" ? "bg-down" : vs?.level === "above" ? "bg-up" : "bg-ink-3";
  return (
    <span aria-hidden className="relative mt-2 block h-1.5 rounded-full bg-fill">
      <span className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${(value / scale) * 100}%` }} />
      {median && <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `${(median / scale) * 100}%` }} />}
    </span>
  );
}

function Photo({ src, sizes, className }: { src: string | null; sizes: string; className: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-[14px] bg-fill ${className}`}>
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="grid h-full place-items-center text-ink-4">
          <Landmark aria-hidden size={28} />
        </span>
      )}
    </span>
  );
}

type Row = { hall: HallBoard["halls"][number]; total: number; vs: PriceComparison | null };

function BoardRow({ label, rows, render }: { label: string; rows: Row[]; render: (row: Row) => React.ReactNode }) {
  return (
    <tr>
      <th scope="row" className="border-t border-line bg-fill-2 p-3 text-left text-[13px] font-semibold text-ink-3">
        {label}
      </th>
      {rows.map((row, i) => (
        <td key={row.hall.id} className={`border-t border-line p-3 text-right ${i === 0 ? "bg-brand-tint" : ""}`}>
          {render(row)}
        </td>
      ))}
    </tr>
  );
}

function EmptyHalls({ onExample }: { onExample: () => void }) {
  return (
    <div className="mt-4 rounded-[20px] border border-dashed border-ink-4 p-5">
      <div aria-hidden className="grid grid-cols-5 gap-2">
        {Array.from({ length: MAX_HALLS }, (_, i) => (
          <span key={i} className="grid aspect-square place-items-center rounded-xl bg-fill text-ink-4">
            <Landmark size={22} />
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href="/halls"
          className="flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-brand text-[15px] font-semibold text-white"
        >
          <Plus aria-hidden size={18} /> 웨딩홀 추가
        </Link>
        <button type="button" onClick={onExample} className="h-12 rounded-xl bg-fill px-4 text-[15px] font-semibold text-ink-2">
          예시로 보기
        </button>
      </div>
    </div>
  );
}
