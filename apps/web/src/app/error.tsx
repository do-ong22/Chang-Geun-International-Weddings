"use client"; // 에러 경계는 클라이언트 컴포넌트여야 한다 (Next.js error.js 문서)

import { useEffect } from "react";
import { buttonSecondary } from "@/components/ui";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // ponytail: 오류 수집 도구를 붙이면 여기서 보낸다.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-col items-center px-8 pt-24 text-center">
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">불러오지 못했어요</h1>
      <p className="mt-2 text-[15px] text-ink-2">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={() => retry()} className={`${buttonSecondary} mt-8 max-w-[240px]`}>
        다시 시도
      </button>
    </main>
  );
}
