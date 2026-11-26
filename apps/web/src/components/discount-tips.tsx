import { TicketPercent } from "lucide-react";
import { DISCOUNT_TIPS } from "@wedding/core";
import { SectionTitle } from "@/components/ui";

/** 놓치기 쉬운 할인: 업체가 먼저 말해 주지 않는 할인과 확인할 조건 */
export function DiscountTips() {
  return (
    <section className="rounded-[20px] border border-line p-5">
      <SectionTitle>놓치기 쉬운 할인</SectionTitle>
      <ul className="space-y-4">
        {DISCOUNT_TIPS.map((tip) => (
          <li key={tip.id} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
              <TicketPercent aria-hidden size={18} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold">{tip.title}</span>
              <span className="block text-[13px] text-ink-2">{tip.check}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
