const won = new Intl.NumberFormat("ko-KR");

/** 1800000 → "1,800,000원" */
export function formatWon(amount: number): string {
  return `${won.format(Math.round(amount))}원`;
}

/** 540000 → "54만 원", 5000 → "5천 원". 부호는 붙이지 않는다. */
export function formatManwon(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  if (abs >= 10_000) {
    const man = Math.round(abs / 10_000);
    return `${won.format(man)}만 원`;
  }
  if (abs >= 1_000) return `${Math.round(abs / 1_000)}천 원`;
  return `${won.format(abs)}원`;
}

/** 0.18 → "+18%", -0.07 → "−7%" */
export function formatPercent(ratio: number): string {
  const pct = Math.round(ratio * 100);
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`;
}
