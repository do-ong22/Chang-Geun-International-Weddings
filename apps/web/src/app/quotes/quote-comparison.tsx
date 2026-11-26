"use client";

import { useState } from "react";
import {
  compareToMedian,
  EXTRA_FEE_CHECKLIST,
  formatManwon,
  formatPercent,
  formatWon,
  PRICE_ITEM_LABELS,
  type RegionCode,
  type SdmItem,
} from "@wedding/core";
import type { RegionMediansDTO } from "@/server/container";
import { RegionChips } from "@/components/region-chips";
import { ManwonInput } from "@/components/manwon-input";
import { LevelChip, SectionTitle, StatHeader } from "@/components/ui";
import { FeeChecklist } from "@/components/fee-checklist";
import { DiscountTips } from "@/components/discount-tips";

const ITEMS: SdmItem[] = ["studio", "dress", "makeup"];
const EXAMPLE: Record<SdmItem, number> = { studio: 180, dress: 210, makeup: 95 };
const MANWON = 10_000;

export function QuoteComparison({ data }: { data: RegionMediansDTO }) {
  const [region, setRegion] = useState<RegionCode>("seoul-gangnam");
  const [amounts, setAmounts] = useState<Record<SdmItem, number | null>>({ studio: null, dress: null, makeup: null });

  const medians = data.medians[region] ?? {};
  const regionName = data.regions.find((r) => r.code === region)?.name ?? "";

  // 금액과 중간값이 모두 있는 항목만 비교한다.
  const rows = ITEMS.flatMap((item) => {
    const mine = amounts[item];
    const median = medians[item];
    if (mine === null || median === undefined) return [];
    const amount = mine * MANWON;
    return [{ item, amount, median, comparison: compareToMedian(amount, median) }];
  });
  const myTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const medianTotal = rows.reduce((sum, row) => sum + row.median, 0);
  const total = rows.length > 0 ? compareToMedian(myTotal, medianTotal) : null;

  const checklist = rows.flatMap((row) => EXTRA_FEE_CHECKLIST[row.item]);

  return (
    // 휴대폰: 결과 → 입력 → 추가금 세로(DOM 순서) / PC: 왼쪽 입력, 오른쪽 결과·추가금(col/row 지정)
    <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_380px] md:items-start md:gap-x-10 md:gap-y-4 md:px-5">
      <div className="md:col-start-2 md:row-start-1 md:rounded-[24px] md:border md:border-line md:pt-4">
      {total ? (
        <StatHeader
          label={`스드메 합계 · ${regionName} 중간값 대비`}
          value={
            total.level === "similar"
              ? "비슷"
              : `${total.level === "above" ? "+" : "−"}${formatManwon(total.diff)}`
          }
          tone={total.level === "above" ? "up" : total.level === "below" ? "down" : "default"}
          sub={`내 견적 ${formatWon(myTotal)} · 중간값 ${formatWon(medianTotal)}`}
        />
      ) : (
        <StatHeader label={`스드메 합계 · ${regionName} 중간값 대비`} value="—" tone="muted" sub="견적 미입력" />
      )}
      </div>

      <div className="md:col-start-1 md:row-span-2 md:row-start-1">
      <section className="px-5 pb-8 md:px-0">
        <SectionTitle>지역</SectionTitle>
        <RegionChips regions={data.regions} value={region} onChange={setRegion} />
      </section>

      <section className="px-5 pb-8 md:px-0">
        <SectionTitle
          action={
            <button
              type="button"
              onClick={() => setAmounts(EXAMPLE)}
              className="h-11 rounded-lg px-2 text-[14px] font-semibold text-brand hover:bg-brand-tint"
            >
              예시 입력
            </button>
          }
        >
          받은 견적
        </SectionTitle>
        <ul className="space-y-4 md:space-y-6">
          {ITEMS.map((item) => {
            const median = medians[item];
            const row = rows.find((r) => r.item === item);
            return (
              <li key={item}>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor={`quote-${item}`} className="text-[16px] font-semibold">
                    {PRICE_ITEM_LABELS[item]}
                  </label>
                  {row && <LevelChip level={row.comparison.level} detail={formatPercent(row.comparison.ratio)} />}
                </div>
                <ManwonInput
                  id={`quote-${item}`}
                  value={amounts[item]}
                  onChange={(value) => setAmounts((prev) => ({ ...prev, [item]: value }))}
                  placeholder={median ? `중간값 ${Math.round(median / MANWON)}` : "금액"}
                />
                {row && <CompareBars amount={row.amount} median={row.median} />}
              </li>
            );
          })}
        </ul>
      </section>
      </div>

      {/* 휴대폰: 입력 아래 / PC: 오른쪽 결과 아래 */}
      <div className="mx-5 mb-4 space-y-4 md:col-start-2 md:row-start-2 md:mx-0">
        <FeeChecklist title="숨은 추가금" items={checklist} />
        <DiscountTips />
      </div>
    </div>
  );
}

function CompareBars({ amount, median }: { amount: number; median: number }) {
  const max = Math.max(amount, median);
  return (
    <dl className="mt-3 space-y-1.5 text-[13px] tabular">
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2">
        <dt className="text-ink-2">내 견적</dt>
        <dd className="h-2 overflow-hidden rounded-full bg-fill">
          <span className="block h-full rounded-full bg-ink" style={{ width: `${(amount / max) * 100}%` }} />
        </dd>
        <dd className="w-[92px] text-right font-semibold">{formatWon(amount)}</dd>
      </div>
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2">
        <dt className="text-ink-3">중간값</dt>
        <dd className="h-2 overflow-hidden rounded-full bg-fill">
          <span className="block h-full rounded-full bg-ink-4" style={{ width: `${(median / max) * 100}%` }} />
        </dd>
        <dd className="w-[92px] text-right text-ink-2">{formatWon(median)}</dd>
      </div>
    </dl>
  );
}
