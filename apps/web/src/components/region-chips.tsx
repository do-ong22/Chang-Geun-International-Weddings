"use client";

import type { RegionCode } from "@wedding/core";

/** 가로로 넘기는 지역 선택 칩 */
export function RegionChips({
  regions,
  value,
  onChange,
}: {
  regions: readonly { code: RegionCode; name: string }[];
  value: RegionCode;
  onChange: (code: RegionCode) => void;
}) {
  return (
    <div role="group" aria-label="지역" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {regions.map((region) => {
        const selected = region.code === value;
        return (
          <button
            key={region.code}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(region.code)}
            className={`h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${
              selected ? "bg-ink text-white" : "bg-fill text-ink-2 hover:bg-line"
            }`}
          >
            {region.name}
          </button>
        );
      })}
    </div>
  );
}
