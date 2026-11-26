import { Suspense } from "react";
import { regionPrices } from "@/server/container";
import { NavBar, SourceNote } from "@/components/ui";
import { HallComparison } from "./hall-comparison";

export default function HallsPage() {
  return (
    <main>
      <NavBar title="웨딩홀 비교" />
      <Suspense fallback={<p className="px-5 py-10 text-ink-3">지역 평균을 불러오는 중…</p>}>
        <HallsLoader />
      </Suspense>
    </main>
  );
}

async function HallsLoader() {
  const data = await regionPrices.getMedians();
  return (
    <>
      <HallComparison data={data} />
      <SourceNote basedOn={data.basedOn} />
    </>
  );
}
