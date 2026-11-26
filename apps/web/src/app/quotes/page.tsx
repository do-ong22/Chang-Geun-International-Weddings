import { Suspense } from "react";
import { regionPrices } from "@/server/container";
import { NavBar, SourceNote } from "@/components/ui";
import { QuoteComparison } from "./quote-comparison";

export default function QuotesPage() {
  return (
    <main>
      <NavBar title="스드메 견적 비교" />
      <Suspense fallback={<p className="px-5 py-10 text-ink-3">지역 평균을 불러오는 중…</p>}>
        <QuotesLoader />
      </Suspense>
    </main>
  );
}

async function QuotesLoader() {
  const data = await regionPrices.getMedians();
  return (
    <>
      <QuoteComparison data={data} />
      <SourceNote basedOn={data.basedOn} />
    </>
  );
}
