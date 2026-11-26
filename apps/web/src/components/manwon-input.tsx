"use client";

/** 숫자만 남기고 상한을 둔다. 비면 null. */
export function parseAmount(text: string, max: number): number | null {
  // 자릿수를 상한에 맞춰 자르면 "12000"이 1200으로 바뀐다. 넉넉히 자른 뒤 상한으로 막는다.
  const digits = text.replace(/\D/g, "").slice(0, 12);
  if (digits === "") return null;
  return Math.min(Number(digits), max);
}

/** 단위가 붙은 숫자 입력칸 (만 원, 원, 명) */
export function AmountInput({
  id,
  value,
  onChange,
  unit,
  max,
  placeholder,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
  max: number;
  placeholder?: string;
}) {
  return (
    <div className="flex h-12 items-center rounded-xl bg-fill px-3 focus-within:ring-2 focus-within:ring-brand">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value === null ? "" : value.toLocaleString("ko-KR")}
        placeholder={placeholder}
        onChange={(event) => onChange(parseAmount(event.target.value, max))}
        className="w-full min-w-0 bg-transparent text-right text-[17px] font-semibold tabular outline-none placeholder:font-medium placeholder:text-ink-2"
      />
      <span className="ml-1 shrink-0 text-[15px] text-ink-2">{unit}</span>
    </div>
  );
}

export const MAX_MANWON = 100_000; // 10억 원

export function ManwonInput(props: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  return <AmountInput {...props} unit="만 원" max={MAX_MANWON} />;
}
