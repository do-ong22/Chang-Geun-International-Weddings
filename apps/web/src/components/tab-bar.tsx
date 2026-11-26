"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, House, Landmark, Receipt, Wallet } from "lucide-react";
import { BRAND_NAME, BrandLogo } from "@/components/brand";

const TABS = [
  { href: "/", label: "홈", icon: House },
  { href: "/quotes", label: "견적", icon: Receipt },
  { href: "/halls", label: "웨딩홀", icon: Landmark },
  { href: "/budget", label: "비용", icon: Wallet },
  { href: "/schedule", label: "일정", icon: CalendarCheck },
] as const;

/** 정확히 그 탭이면 "page", 탭 아래 하위 화면이면 "true", 아니면 없음 */
function currentState(pathname: string | null, href: string): "page" | "true" | undefined {
  if (pathname === null) return undefined;
  if (pathname === href) return "page";
  if (href === "/") return pathname.startsWith("/prices/") ? "true" : undefined;
  return pathname.startsWith(`${href}/`) ? "true" : undefined;
}

/**
 * 휴대폰: 하단 탭 / PC(md 이상): 상단 메뉴 바. 같은 메뉴를 화면 크기에 따라 다르게 그린다.
 * pathname이 null이면 선택 표시 없이 그린다 (Suspense 대기 화면용).
 */
export function TabBarLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      <TopNav pathname={pathname} />
      <BottomTabs pathname={pathname} />
    </>
  );
}

function TopNav({ pathname }: { pathname: string | null }) {
  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-10 px-8">
        <Link href="/" aria-label={`${BRAND_NAME} 홈`} aria-current={currentState(pathname, "/")}>
          <BrandLogo />
        </Link>
        <nav aria-label="주요 메뉴" className="flex h-full items-stretch gap-1">
          {TABS.filter((tab) => tab.href !== "/").map(({ href, label }) => {
            const current = currentState(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={current}
                className={`flex items-center border-b-2 px-3 text-[15px] font-semibold transition-colors ${
                  current ? "border-brand text-ink" : "border-transparent text-ink-3 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function BottomTabs({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const current = currentState(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  current ? "text-brand" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                <Icon aria-hidden size={22} strokeWidth={current ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TabBar() {
  return <TabBarLinks pathname={usePathname()} />;
}
