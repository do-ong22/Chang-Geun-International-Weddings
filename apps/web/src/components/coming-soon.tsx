import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { NavBar, buttonSecondary } from "@/components/ui";

/** 아직 만들지 않은 탭 화면 */
export function ComingSoon({ title, icon: Icon, summary }: { title: string; icon: LucideIcon; summary: string }) {
  return (
    <main>
      <NavBar title={title} />
      <section className="flex flex-col items-center px-8 pt-20 pb-10 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-brand-tint text-brand">
          <Icon aria-hidden size={36} />
        </span>
        <h2 className="mt-6 text-[22px] font-bold tracking-[-0.02em]">준비 중</h2>
        <p className="mt-2 text-[15px] text-ink-2">{summary}</p>
        <Link href="/quotes" className={`${buttonSecondary} mt-10`}>
          견적 비교로 이동
        </Link>
      </section>
    </main>
  );
}
