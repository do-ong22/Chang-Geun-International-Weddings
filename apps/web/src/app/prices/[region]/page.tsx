import { Suspense } from "react";
import { notFound } from "next/navigation";
import { compareToMedian, formatPercent, formatWon, isRegionCode } from "@wedding/core";
import { regionPrices } from "@/server/container";
import { LevelChip, NavBar, SourceNote } from "@/components/ui";

// ponytail: 지금은 요청 시점에 params를 읽는다. 검색 노출이 필요해지면
// generateStaticParams로 14개 지역 페이지를 미리 만든다.
export default function RegionPricePage(props: PageProps<"/prices/[region]">) {
  return (
    <main>
      <NavBar title="지역 평균 가격" backHref="/" />
      <Suspense fallback={<p className="px-5 py-10 text-ink-3">가격을 불러오는 중…</p>}>
        <RegionPrices params={props.params} />
      </Suspense>
    </main>
  );
}

async function RegionPrices({ params }: { params: PageProps<"/prices/[region]">["params"] }) {
  const { region } = await params;
  if (!isRegionCode(region)) notFound();

  const summary = await regionPrices.getSummary(region);
  const basedOn = summary.items.find((row) => row.basedOn)?.basedOn ?? null;

  return (
    <>
      <section className="px-5 pt-2 pb-6">
        <p className="text-[15px] font-medium text-ink-2">{summary.regionName}</p>
        <h2 className="mt-1 text-[26px] leading-[1.3] font-bold tracking-[-0.03em]">결혼 비용 중간값</h2>
      </section>

      <ul className="divide-y divide-line border-y border-line">
        {summary.items.map((row) => {
          const vsNational =
            row.median !== null && row.nationalMedian ? compareToMedian(row.median, row.nationalMedian) : null;
          return (
            <li key={row.item} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-[16px] font-semibold">{row.label}</p>
                <p className="mt-0.5 text-[13px] text-ink-3 tabular">
                  전국 {row.nationalMedian ? formatWon(row.nationalMedian) : "자료 없음"}
                  {row.smallSample && <span className="text-warn"> · 표본 {row.sampleCount}건, 참고만</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[17px] font-bold tabular">{row.median !== null ? formatWon(row.median) : "자료 없음"}</p>
                {vsNational && (
                  <span className="mt-1 inline-block">
                    <LevelChip level={vsNational.level} detail={`전국 대비 ${formatPercent(vsNational.ratio)}`} />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <SourceNote basedOn={basedOn} />
    </>
  );
}
