import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { compareToMedian, formatManwon, formatPercent, formatWon, type PriceItem } from "@wedding/core";
import type { RegionMediansDTO, RegionPriceSummaryDTO } from "@/server/container";
import { LevelChip, SectionTitle } from "@/components/ui";

/** 100만 원 이상은 "153만 원", 그 아래는 "88,000원" */
function formatShort(amount: number) {
  return amount >= 1_000_000 ? formatManwon(amount) : formatWon(amount);
}

/** 한 지역의 항목별 중간값 타일 (전국 대비) */
export function MarketTiles({ summary, href }: { summary: RegionPriceSummaryDTO; href: string }) {
  return (
    <section className="px-5 pt-10">
      <SectionTitle
        action={
          <Link href={href} className="inline-flex h-11 items-center text-[14px] font-semibold text-ink-2 hover:text-ink">
            전체 <ChevronRight aria-hidden size={16} />
          </Link>
        }
      >
        {summary.regionName} 시세
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {summary.items.map((row) => {
          const vs = row.median !== null && row.nationalMedian ? compareToMedian(row.median, row.nationalMedian) : null;
          return (
            <li key={row.item} className="rounded-[20px] bg-fill-2 p-4 md:p-5">
              <p className="text-[13px] font-medium text-ink-2">{row.label}</p>
              <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] tabular">
                {row.median !== null ? formatShort(row.median) : "—"}
              </p>
              {vs && (
                <span className="mt-2 inline-block">
                  <LevelChip level={vs.level} detail={`전국 ${formatPercent(vs.ratio)}`} />
                </span>
              )}
              {row.smallSample && <p className="mt-1 text-[12px] font-medium text-warn">표본 {row.sampleCount}건 · 참고</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 지역별 순위 막대 그래프 (한 항목) */
export function RegionRanking({
  data,
  item,
  title,
  highlight,
}: {
  data: RegionMediansDTO;
  item: PriceItem;
  title: string;
  highlight: string;
}) {
  const rows = data.regions
    .flatMap((region) => {
      const value = data.medians[region.code]?.[item];
      return value === undefined ? [] : [{ ...region, value }];
    })
    .sort((a, b) => b.value - a.value);
  const max = rows[0]?.value ?? 0;

  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 && <p className="text-[14px] text-ink-2">자료 없음</p>}
      {rows.length > 0 && (
      <ol className="space-y-2.5">
        {rows.map((row, index) => {
          const isHighlight = row.code === highlight;
          return (
            <li key={row.code} className="grid grid-cols-[20px_92px_1fr_auto] items-center gap-2 text-[14px] tabular">
              <span className="text-center text-[13px] font-semibold text-ink-3">{index + 1}</span>
              {/* 지역 이름은 자르지 않는다("서울 강남 외"가 "서울 강남"처럼 보이면 안 된다) */}
              <Link
                href={`/prices/${row.code}`}
                className={`whitespace-nowrap hover:underline ${isHighlight ? "font-bold" : "font-medium"}`}
              >
                {row.name}
                {isHighlight && <span className="sr-only"> (기준 지역)</span>}
              </Link>
              <span className="h-2.5 overflow-hidden rounded-full bg-fill" aria-hidden>
                <span
                  className={`block h-full rounded-full ${isHighlight ? "bg-brand" : "bg-ink-4"}`}
                  style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }}
                />
              </span>
              <span className={`w-[76px] text-right ${isHighlight ? "font-bold" : "text-ink-2"}`}>{formatShort(row.value)}</span>
            </li>
          );
        })}
      </ol>
      )}
    </section>
  );
}
