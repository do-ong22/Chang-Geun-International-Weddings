import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgePercent, ListChecks, ShieldCheck, Wallet } from "lucide-react";
import { formatWon, REGIONS } from "@wedding/core";
import { regionPrices } from "@/server/container";
import { BRAND_NAME, BrandLogo } from "@/components/brand";
import { SectionTitle, SourceNote, buttonPrimary, buttonSecondary } from "@/components/ui";
import { MarketTiles, RegionRanking } from "@/components/market-sections";
import { SAMPLE_PHOTOS } from "@/lib/sample-photos";
import { HomeDashboard } from "./home-dashboard";

export default function Home() {
  return (
    <main>
      {/* PC에서는 상단 메뉴 바에 로고가 있다 */}
      <header className="flex h-14 items-center px-5 md:hidden">
        <BrandLogo />
      </header>

      <h1 className="sr-only">{BRAND_NAME} 홈</h1>
      <WebIntro />
      <Suspense fallback={<div className="mx-5 h-[420px] animate-pulse rounded-[20px] bg-fill md:mt-8" />}>
        <DashboardLoader />
      </Suspense>

      <h2 className="px-5 pt-14 text-[20px] font-bold tracking-[-0.02em]">지역 시세</h2>
      <Suspense fallback={<div className="mx-5 mt-10 h-40 animate-pulse rounded-[20px] bg-fill" />}>
        <MarketOverview />
      </Suspense>

      <section className="px-5 pt-12 pb-10 md:pt-14">
        <SectionTitle>지역별 평균 가격</SectionTitle>
        <ul className="grid grid-cols-3 gap-2 md:grid-cols-7">
          {REGIONS.map((region) => (
            <li key={region.code}>
              <Link
                href={`/prices/${region.code}`}
                className="flex h-12 items-center justify-center rounded-xl border border-line text-[14px] font-medium transition-colors hover:bg-fill-2"
              >
                {region.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/** 실제 조사 자료로 채우는 시세 영역: 강남 타일 + 지역별 순위 */
async function MarketOverview() {
  const [summary, medians] = await Promise.all([
    regionPrices.getSummary("seoul-gangnam"),
    regionPrices.getMedians(),
  ]);
  return (
    <>
      <MarketTiles summary={summary} href="/prices/seoul-gangnam" />
      <div className="grid gap-10 px-5 pt-12 md:grid-cols-2 md:gap-12">
        <RegionRanking data={medians} item="hall_meal_per_person" title="지역별 1인당 식대" highlight="seoul-gangnam" />
        <RegionRanking data={medians} item="hall_rental" title="지역별 대관료" highlight="seoul-gangnam" />
      </div>
      <SourceNote basedOn={medians.basedOn} />
    </>
  );
}

async function DashboardLoader() {
  return <HomeDashboard data={await regionPrices.getMedians()} />;
}

const FEATURES = [
  { icon: BadgePercent, label: "지역 시세 대비" },
  { icon: ListChecks, label: "숨은 추가금 체크" },
  { icon: Wallet, label: "잔금 일정·비용 장부" },
] as const;

/** PC 웹 첫 화면: 처음 온 사람이 무슨 서비스인지 바로 알게. 휴대폰은 앱처럼 대시보드부터 */
function WebIntro() {
  return (
    <section aria-labelledby="intro-title" className="hidden px-5 pt-10 md:block lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
      <div>
        <p className="text-[15px] font-semibold text-brand">커플이 함께 쓰는 결혼 준비</p>
        <h2 id="intro-title" className="mt-3 text-[44px] leading-[1.15] font-extrabold tracking-[-0.04em]">
          웨딩홀 견적,
          <br />
          총액으로 비교
        </h2>
        <ul className="mt-7 grid max-w-[560px] grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="rounded-2xl bg-fill-2 p-4">
              <Icon aria-hidden size={22} className="text-brand" />
              <p className="mt-2 text-[15px] font-semibold">{label}</p>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex gap-3">
          <Link href="/halls" className={`${buttonPrimary} md:w-auto md:px-7`}>
            웨딩홀 비교 시작
          </Link>
          <Link href="/quotes" className={`${buttonSecondary} md:w-auto md:px-7`}>
            스드메 견적 비교
          </Link>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
          <ShieldCheck aria-hidden size={16} /> 광고·업체 영업 연락 없음
        </p>
      </div>
      <div className="relative hidden aspect-[5/4] overflow-hidden rounded-[28px] bg-fill lg:block">
        {/* lg 미만에서는 숨겨지므로 preload 대신 fetchPriority(숨겨진 폭에서는 lazy라 받지 않음) */}
        <Image src={SAMPLE_PHOTOS.garden} alt="" fill fetchPriority="high" sizes="(min-width: 1024px) 50vw, 1px" className="object-cover" />
        <Suspense fallback={null}>
          <MealChip />
        </Suspense>
      </div>
    </section>
  );
}

/** 소개 사진 위 실제 시세 한 줄. 문구·버튼은 기다리지 않고 바로 보이게 이것만 스트리밍한다. */
async function MealChip() {
  const meal = (await regionPrices.getMedians()).medians["seoul-gangnam"]?.hall_meal_per_person;
  if (!meal || meal <= 0) return null;
  return (
    <div className="absolute bottom-5 left-5 rounded-2xl bg-white/95 px-5 py-4 shadow-lg backdrop-blur">
      <p className="text-[13px] font-semibold text-ink-3">서울 강남 · 1인 식대 중간값</p>
      <p className="text-[26px] font-extrabold tracking-[-0.03em] tabular">{formatWon(meal)}</p>
    </div>
  );
}
