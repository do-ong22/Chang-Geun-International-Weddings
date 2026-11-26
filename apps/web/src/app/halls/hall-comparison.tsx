"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ImagePlus, Landmark, X } from "lucide-react";
import {
  calculateHallCost,
  compareToMedian,
  EXTRA_FEE_CHECKLIST,
  formatManwon,
  formatPercent,
  formatWon,
  MAX_HALLS,
  type RegionCode,
  type SavedHall,
} from "@wedding/core";
import type { RegionMediansDTO } from "@/server/container";
import { RegionChips } from "@/components/region-chips";
import { AmountInput } from "@/components/manwon-input";
import { LevelChip, SectionTitle, StatHeader, buttonPrimary } from "@/components/ui";
import { FeeChecklist } from "@/components/fee-checklist";
import { DiscountTips } from "@/components/discount-tips";
import { DEFAULT_HALL_BOARD, EXAMPLE_HALLS, readHallBoard, writeHallBoard } from "@/lib/local-store";

const MANWON = 10_000;

/** photo: 예시 사진 주소 또는 사용자가 고른 사진의 blob 주소(이 기기 화면에만 있고 저장되지 않음) */
type Hall = SavedHall;


const isBlob = (url: string | null): url is string => url?.startsWith("blob:") ?? false;

export function HallComparison({ data }: { data: RegionMediansDTO }) {
  const [region, setRegion] = useState<RegionCode>(DEFAULT_HALL_BOARD.region);
  const [guests, setGuests] = useState<number | null>(DEFAULT_HALL_BOARD.guests);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loaded, setLoaded] = useState(false);
  // 불러온 직후에는 저장하지 않는다. 검증으로 걸러진 값이 원본을 덮지 않게, 사용자가 고친 뒤부터 쓴다.
  const skipSave = useRef(true);

  // 저장소는 클라이언트에서만 읽는다(서버 렌더와 어긋나지 않게). 홈 대시보드가 같은 값을 읽는다.
  useEffect(() => {
    const board = readHallBoard();
    /* eslint-disable react-hooks/set-state-in-effect -- 외부 저장소에서 한 번 불러오는 초기화 */
    setRegion(board.region);
    setGuests(board.guests);
    setHalls(board.halls);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    writeHallBoard({ region, guests, halls });
  }, [region, guests, halls, loaded]);

  // ponytail: blob 주소는 홀을 뺄 때만 정리한다. 다른 탭으로 옮기면 이 화면은 숨겨진 채 보존되므로
  // (Cache Components의 Activity) useEffect cleanup으로 정리하면 돌아왔을 때 사진이 깨진다.
  // 보존 범위를 넘어 상태가 사라진 경우의 blob은 새로고침 때 풀린다. Storage 업로드가 생기면 없어질 문제다.

  const medianMeal = data.medians[region]?.hall_meal_per_person;
  const medianRental = data.medians[region]?.hall_rental;
  const guestCount = guests ?? 0;

  // 하객 수를 지우는 중에는 0명 기준 순위를 보여 주지 않는다.
  const ranked =
    guests === null
      ? []
      : halls
          .map((hall) => ({ hall, cost: calculateHallCost(hall, guests) }))
          .sort((a, b) => a.cost.total - b.cost.total);
  const cheapest = ranked[0];
  const priciest = ranked.at(-1);

  function remove(id: string) {
    const target = halls.find((h) => h.id === id);
    if (target && isBlob(target.photo)) URL.revokeObjectURL(target.photo);
    setHalls((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <>
      {/* PC: 왼쪽 결과 숫자, 오른쪽 지역·하객 입력 */}
      <div className="md:grid md:grid-cols-2 md:items-end md:gap-10 md:px-5 md:pb-4">
      <div className="md:[&>section]:px-0">
      {cheapest && priciest && ranked.length >= 2 ? (
        <StatHeader
          label={`최저 총비용 · 하객 ${guestCount.toLocaleString("ko-KR")}명`}
          value={formatWon(cheapest.cost.total)}
          sub={
            <>
              <span className="font-semibold text-brand">{cheapest.hall.name}</span> · 최고가 대비 −
              {formatManwon(priciest.cost.total - cheapest.cost.total)}
            </>
          }
        />
      ) : (
        <StatHeader
          label="최저 총비용"
          value="—"
          tone="muted"
          sub={guests === null && halls.length >= 2 ? "예상 하객 미입력" : `웨딩홀 ${halls.length}/${MAX_HALLS}`}
        />
      )}
      </div>

      <div>
      <section className="px-5 pb-6 md:px-0">
        <SectionTitle>지역</SectionTitle>
        <RegionChips regions={data.regions} value={region} onChange={setRegion} />
      </section>

      <section className="flex items-center justify-between gap-4 px-5 pb-8 md:px-0">
        <label htmlFor="guests" className="text-[19px] font-bold tracking-[-0.02em]">
          예상 하객
        </label>
        <div className="w-[150px]">
          <AmountInput id="guests" value={guests} onChange={setGuests} unit="명" max={2000} />
        </div>
      </section>
      </div>
      </div>

      <section className="pb-8">
        <div className="px-5">
          <SectionTitle
            action={
              loaded && halls.length === 0 && (
                <button
                  type="button"
                  onClick={() => setHalls(EXAMPLE_HALLS)}
                  className="h-11 rounded-lg px-2 text-[14px] font-semibold text-brand hover:bg-brand-tint"
                >
                  예시 입력
                </button>
              )
            }
          >
            투어한 웨딩홀 <span className="text-[15px] font-semibold text-ink-3">{halls.length}/{MAX_HALLS}</span>
          </SectionTitle>
        </div>
        {halls.length > 0 && (
          // 휴대폰: 옆으로 넘기는 카드 / PC: 한 줄에 5칸
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:grid md:grid-cols-5 md:gap-5 md:overflow-visible">
            {halls.map((hall) => {
              const meal = medianMeal ? compareToMedian(hall.mealPerPerson, medianMeal) : null;
              return (
                <li key={hall.id} className="w-[168px] shrink-0 snap-start md:w-auto">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-fill">
                    {hall.photo ? (
                      <Image src={hall.photo} alt={`${hall.name} 사진`} fill sizes="(max-width: 768px) 168px, 210px" className="object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-ink-4">
                        <Landmark aria-hidden size={36} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(hall.id)}
                      aria-label={`${hall.name} 빼기`}
                      className="absolute top-1 right-1 grid h-11 w-11 place-items-center"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white">
                        <X aria-hidden size={16} />
                      </span>
                    </button>
                  </div>
                  <p className="mt-2 truncate text-[15px] font-semibold">{hall.name}</p>
                  <p className="text-[13px] text-ink-2 tabular">1인 {formatWon(hall.mealPerPerson)}</p>
                  {meal && (
                    <span className="mt-1 inline-block">
                      <LevelChip level={meal.level} detail={formatPercent(meal.ratio)} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 휴대폰: 추가 폼 → 순위 세로 / PC: 왼쪽 순위, 오른쪽 추가 폼 */}
      <div className="flex flex-col md:grid md:grid-cols-2 md:items-start md:gap-10 md:px-5">
      {halls.length < MAX_HALLS && (
        <div className="order-1 md:order-2 md:[&>section]:mx-0">
          <AddHallForm onAdd={(hall) => setHalls((prev) => [...prev, hall].slice(0, MAX_HALLS))} />
        </div>
      )}

      {ranked.length >= 2 && (
        <section className="order-2 px-5 pb-6 md:order-1 md:px-0">
          <SectionTitle>총비용 순위</SectionTitle>
          <ol className="divide-y divide-line rounded-[20px] border border-line">
            {ranked.map(({ hall, cost }, index) => (
              <li key={hall.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-5 text-center text-[17px] font-bold ${index === 0 ? "text-brand" : "text-ink-3"}`}>
                  {index + 1}
                </span>
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-fill">
                  {hall.photo && <Image src={hall.photo} alt="" fill sizes="44px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{hall.name}</span>
                  {cost.unusedGuaranteeCost > 0 && (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-warn">
                      <AlertTriangle aria-hidden size={12} /> 보증 인원 미달 +{formatManwon(cost.unusedGuaranteeCost)}
                    </span>
                  )}
                </span>
                <span className="text-right tabular">
                  <span className="block text-[15px] font-bold">{formatWon(cost.total)}</span>
                  <span className="block text-[12px] text-ink-3">
                    {index === 0 ? "가장 저렴" : `1위보다 +${formatManwon(cost.total - ranked[0].cost.total)}`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      </div>

      {ranked.length >= 2 && (
        <section className="pb-6">
          <div className="px-5">
            <SectionTitle>항목별 비교</SectionTitle>
          </div>
          <div className="overflow-x-auto px-5 [scrollbar-width:none]" role="region" aria-label="항목별 비교표, 옆으로 넘겨 보기" tabIndex={0}>
            <table className="w-max border-separate border-spacing-0 text-[14px] tabular">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] w-[88px] bg-white" />
                  {ranked.map(({ hall }) => (
                    <th key={hall.id} scope="col" className="w-[120px] px-2 pb-2 text-left text-[14px] font-semibold">
                      {hall.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="1인당 식대" values={ranked.map((r) => r.hall.mealPerPerson)} median={medianMeal} />
                <CompareRow label="대관료" values={ranked.map((r) => r.hall.rental)} median={medianRental} />
                <CompareRow label="보증 인원" values={ranked.map((r) => r.hall.guaranteedGuests)} unit="명" />
                <CompareRow label="총비용" values={ranked.map((r) => r.cost.total)} strong />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 휴대폰: 세로 / PC: 추가금 확인과 할인을 나란히 */}
      <div className="grid gap-4 px-5 pb-8 md:grid-cols-2 md:gap-10">
        <FeeChecklist title="웨딩홀 추가 확인" items={EXTRA_FEE_CHECKLIST.hall} />
        <DiscountTips />
      </div>
    </>
  );
}

function CompareRow({
  label,
  values,
  median,
  unit,
  strong,
}: {
  label: string;
  values: number[];
  median?: number;
  unit?: string;
  strong?: boolean;
}) {
  const best = Math.min(...values);
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-[1] border-t border-line bg-white py-3 pr-2 text-left text-[13px] font-medium text-ink-2">
        {label}
      </th>
      {values.map((value, index) => (
        <td key={index} className={`border-t border-line px-2 py-3 align-top ${value === best ? "bg-down-tint" : ""}`}>
          <span className={`block ${strong ? "font-bold" : "font-semibold"}`}>
            {unit ? `${value.toLocaleString("ko-KR")}${unit}` : formatWon(value)}
          </span>
          {value === best && <span className="block text-[12px] font-semibold text-down-ink">가장 유리</span>}
          {median !== undefined && value !== best && (
            <span className="block text-[12px] text-ink-3">중간값 대비 {formatPercent(compareToMedian(value, median).ratio)}</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function AddHallForm({ onAdd }: { onAdd: (hall: Hall) => void }) {
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<number | null>(null);
  const [rental, setRental] = useState<number | null>(null);
  const [guaranteed, setGuaranteed] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const valid = name.trim() !== "" && meal !== null && rental !== null && guaranteed !== null;

  function pickPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (photo) URL.revokeObjectURL(photo);
    // ponytail: 사진은 이 기기 화면에만 보인다. 로그인·저장 기능이 생기면 Supabase Storage로 올린다.
    setPhoto(URL.createObjectURL(file));
  }

  function submit() {
    if (name.trim() === "" || meal === null || rental === null || guaranteed === null) return;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 40),
      mealPerPerson: meal,
      rental: rental * MANWON,
      guaranteedGuests: guaranteed,
      photo,
    });
    setName("");
    setMeal(null);
    setRental(null);
    setGuaranteed(null);
    setPhoto(null);
  }

  return (
    <section className="mx-5 mb-8 rounded-[20px] bg-fill-2 p-5">
      <SectionTitle>웨딩홀 추가</SectionTitle>
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <label className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-dashed border-ink-4 bg-white text-ink-3 focus-within:ring-2 focus-within:ring-brand">
          {photo ? (
            <Image src={photo} alt="고른 사진" fill sizes="88px" className="object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-[12px] font-medium">
              <ImagePlus aria-hidden size={22} /> 사진
            </span>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
        <div className="flex flex-col justify-end">
          <label htmlFor="hall-name" className="mb-1.5 text-[13px] font-medium text-ink-2">
            홀 이름
          </label>
          <input
            id="hall-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 라온홀"
            className="h-12 rounded-xl bg-white px-3 text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-ink-3 focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hall-meal" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            1인당 식대
          </label>
          <AmountInput id="hall-meal" value={meal} onChange={setMeal} unit="원" max={1_000_000} />
        </div>
        <div>
          <label htmlFor="hall-rental" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            대관료
          </label>
          <AmountInput id="hall-rental" value={rental} onChange={setRental} unit="만 원" max={100_000} />
        </div>
        <div className="col-span-2">
          <label htmlFor="hall-guaranteed" className="mb-1.5 block text-[13px] font-medium text-ink-2">
            보증 인원
          </label>
          <AmountInput id="hall-guaranteed" value={guaranteed} onChange={setGuaranteed} unit="명" max={2000} />
        </div>
      </div>
      <button type="button" disabled={!valid} onClick={submit} className={`${buttonPrimary} mt-4`}>
        비교에 넣기
      </button>
    </section>
  );
}
