"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { ChecklistItem } from "@wedding/core";
import { SectionTitle } from "@/components/ui";

/** 견적에 포함됐는지 확인하는 추가금 체크 목록 (견적·웨딩홀 화면 공용) */
export function FeeChecklist({ title, items }: { title: string; items: readonly ChecklistItem[] }) {
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());
  const unconfirmed = items.filter((item) => !confirmed.has(item.id)).length;

  function toggle(id: string) {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-[20px] bg-fill-2 p-5">
      <SectionTitle>
        {title}{" "}
        {unconfirmed > 0 && <span className="text-[15px] font-semibold text-warn">확인 필요 {unconfirmed}개</span>}
      </SectionTitle>
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const checked = confirmed.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(item.id)}
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                    checked ? "border-brand bg-brand text-white" : "border-ink-4 bg-white"
                  }`}
                >
                  {checked && <Check aria-hidden size={16} strokeWidth={3} />}
                </span>
                <span className={`text-[15px] ${checked ? "text-ink-2 line-through" : "font-medium"}`}>{item.name}</span>
                {/* 상태는 aria-checked로 전달한다. 글자는 눈으로 보는 용도 */}
                <span aria-hidden className={`ml-auto text-[13px] font-semibold ${checked ? "text-ink-3" : "text-warn"}`}>
                  {checked ? "포함 확인" : "확인 필요"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
