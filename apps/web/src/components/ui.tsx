import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { PriceLevel } from "@wedding/core";
import type { ReactNode } from "react";

/** 상단 내비게이션 바: 뒤로가기 + 가운데 제목 (iOS 앱 문법) */
export function NavBar({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="sticky top-0 z-10 grid h-14 grid-cols-[48px_1fr_48px] items-center bg-white/95 px-1 backdrop-blur md:static md:flex md:h-auto md:items-center md:gap-2 md:bg-transparent md:px-5 md:pt-10 md:pb-6">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="뒤로"
          className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-fill md:-ml-3"
        >
          <ChevronLeft aria-hidden size={24} />
        </Link>
      ) : (
        <span className="md:hidden" />
      )}
      <h1 className="text-center text-[17px] font-semibold md:text-left md:text-[30px] md:font-bold md:tracking-[-0.03em]">
        {title}
      </h1>
      <span className="md:hidden" />
    </header>
  );
}

/** 화면 맨 위 핵심 숫자: 작은 라벨 + 큰 숫자 + 보조 한 줄 (말 거는 문장 대신) */
export function StatHeader({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: string;
  tone?: "default" | "up" | "down" | "muted";
  sub?: ReactNode;
}) {
  const toneClass = { default: "text-ink", up: "text-up", down: "text-down", muted: "text-ink-3" }[tone];
  return (
    <section className="px-5 pt-2 pb-8">
      <p className="text-[14px] font-medium text-ink-2">{label}</p>
      <p className={`mt-1 text-[34px] leading-tight font-bold tracking-[-0.03em] tabular ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1.5 text-[14px] text-ink-2 tabular">{sub}</p>}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-[19px] font-bold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

const LEVEL_STYLE: Record<PriceLevel, { label: string; className: string }> = {
  above: { label: "높음", className: "bg-up-tint text-up-ink" },
  similar: { label: "비슷함", className: "bg-fill text-ink-2" },
  below: { label: "낮음", className: "bg-down-tint text-down-ink" },
};

/** 평균 대비 높음·비슷함·낮음 칩. 색만이 아니라 글자로도 알려 준다. */
export function LevelChip({ level, detail }: { level: PriceLevel; detail?: string }) {
  const { label, className } = LEVEL_STYLE[level];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold tabular ${className}`}>
      {label}
      {detail && <span className="ml-1 font-medium">{detail}</span>}
    </span>
  );
}

export const buttonPrimary =
  "flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[16px] font-semibold text-white transition-transform active:scale-[0.98] disabled:bg-fill disabled:text-ink-3";
export const buttonSecondary =
  "flex h-14 w-full items-center justify-center rounded-2xl bg-fill text-[16px] font-semibold text-ink transition-transform active:scale-[0.98]";

export function SourceNote({ basedOn }: { basedOn: string | null }) {
  return (
    <p className="px-5 py-6 text-[12px] leading-5 text-ink-3">
      출처 한국소비자원 참가격{basedOn ? ` ${basedOn.replace("-", ".")}` : ""} · 지역 중간값 · 업체별 적정가 아님
    </p>
  );
}
