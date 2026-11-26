import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TabBar, TabBarLinks } from "@/components/tab-bar";
import { BRAND_NAME } from "@/components/brand";
import "./globals.css";

// Pretendard (OFL-1.1, fonts/LICENSE.txt). KS X 1001 한글 2,350자 서브셋, 실제 쓰는 굵기 4개.
// ponytail: 굵기당 약 270KB. preload를 끄고 쓰는 굵기만 받게 한다. 첫 화면이 더 빨라야 하면 동적 서브셋으로 바꾼다.
const pretendard = localFont({
  src: [
    { path: "./fonts/Pretendard-Regular.subset.woff2", weight: "400" },
    { path: "./fonts/Pretendard-Medium.subset.woff2", weight: "500" },
    { path: "./fonts/Pretendard-SemiBold.subset.woff2", weight: "600" },
    { path: "./fonts/Pretendard-Bold.subset.woff2", weight: "700" },
  ],
  variable: "--font-pretendard",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "예비부부가 함께 쓰는 결혼 준비 앱. 내 웨딩 견적이 적정한지 지역 평균과 비교해 드려요.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        {/* 동적 경로에서 usePathname이 멈출 수 있어 Suspense로 감싼다 (Next.js use-pathname 문서, Cache Components) */}
        <Suspense fallback={<TabBarLinks pathname={null} />}>
          <TabBar />
        </Suspense>
        {/* 휴대폰: 화면 폭 그대로 + 하단 탭 자리 / PC: 가운데 1120px */}
        <div id="content" className="mx-auto min-h-dvh md:scroll-mt-16 w-full max-w-[1120px] pb-[calc(64px+env(safe-area-inset-bottom))] md:min-h-[calc(100dvh-64px)] md:px-3 md:pb-16">
          {children}
        </div>
      </body>
    </html>
  );
}
