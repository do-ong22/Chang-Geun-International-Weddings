// 서비스 이름(가칭). 바꿀 때는 여기만 바꾼다.
export const BRAND_NAME = "Wedo";

/** 로고 마크: 체크가 들어간 반지 (시안 G) */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[10px] bg-brand text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9.5 5.5 12 3l2.5 2.5" />
        <circle cx="12" cy="14" r="7" />
        <path d="m9 14.2 2.1 2.1L15.2 12" />
      </svg>
    </span>
  );
}

export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark size={28} />
      <span className="text-[20px] font-bold tracking-[-0.04em]">{BRAND_NAME}</span>
    </span>
  );
}
