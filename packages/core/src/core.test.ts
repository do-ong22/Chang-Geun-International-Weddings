import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateHallCost,
  compareToMedian,
  estimateFinalPrice,
  findPeriodSaving,
  isRegionCode,
  isSmallSample,
  type ExtraFee,
} from "./index.ts";

test("compareToMedian: 중간값 대비 높음·비슷함·낮음", () => {
  assert.deepEqual(compareToMedian(1_800_000, 1_500_000), { diff: 300_000, ratio: 0.2, level: "above" });
  assert.equal(compareToMedian(1_540_000, 1_500_000).level, "similar");
  assert.equal(compareToMedian(1_000_000, 1_500_000).level, "below");
  assert.throws(() => compareToMedian(100, 0), RangeError);
  assert.throws(() => compareToMedian(-100, 1_500_000), RangeError);
});

test("estimateFinalPrice: 포함 안 된 같은 업종 추가금만 더한다", () => {
  const fees: ExtraFee[] = [
    { id: "raw", category: "studio", name: "원본", typicalAmount: 220_000 },
    { id: "retouch", category: "studio", name: "수정본", typicalAmount: 100_000 },
    { id: "helper", category: "dress", name: "헬퍼비", typicalAmount: 250_000 },
  ];
  const result = estimateFinalPrice(
    { category: "studio", baseAmount: 1_500_000, includedFeeIds: ["retouch"] },
    fees,
  );
  assert.deepEqual(result.unconfirmedFees.map((fee) => fee.id), ["raw"]);
  assert.equal(result.maxEstimatedTotal, 1_720_000);
  assert.throws(
    () => estimateFinalPrice({ category: "studio", baseAmount: -1, includedFeeIds: [] }, fees),
    RangeError,
  );
});

test("calculateHallCost: 보증 인원 미달이면 보증 인원만큼 낸다", () => {
  const hall = { mealPerPerson: 60_000, rental: 3_000_000, guaranteedGuests: 200 };
  assert.deepEqual(calculateHallCost(hall, 150), { total: 15_000_000, unusedGuaranteeCost: 3_000_000 });
  assert.deepEqual(calculateHallCost(hall, 250), { total: 18_000_000, unusedGuaranteeCost: 0 });
  assert.throws(() => calculateHallCost(hall, -1), RangeError);
  assert.throws(() => calculateHallCost({ ...hall, rental: -1 }, 100), RangeError);
});

test("findPeriodSaving: 가장 싼 달과의 차이", () => {
  const prices = [
    { month: 5, averageTotal: 23_000_000 },
    { month: 7, averageTotal: 19_750_000 },
  ];
  assert.equal(findPeriodSaving(5, prices)?.saving, 3_250_000);
  assert.equal(findPeriodSaving(7, prices)?.saving, 0);
  assert.equal(findPeriodSaving(1, prices), null);
});

test("isSmallSample: 30건 미만은 참고만", () => {
  assert.ok(isSmallSample(29));
  assert.ok(!isSmallSample(30));
});

test("isRegionCode", () => {
  assert.ok(isRegionCode("seoul-gangnam"));
  assert.ok(isRegionCode("jeonnam-gwangju"));
  assert.ok(!isRegionCode("mars"));
});

test("format: 원·만 원·퍼센트", async () => {
  const { formatWon, formatManwon, formatPercent } = await import("./index.ts");
  assert.equal(formatWon(1_800_000), "1,800,000원");
  assert.equal(formatManwon(540_000), "54만 원");
  assert.equal(formatManwon(-50_000), "5만 원");
  assert.equal(formatManwon(5_000), "5천 원");
  assert.equal(formatPercent(0.18), "+18%");
  assert.equal(formatPercent(-0.07), "−7%");
});

test("summarizeLedger: 예산·예상·낸 돈·잔금·초과·다가오는 결제", async () => {
  const { summarizeLedger, daysUntil } = await import("./index.ts");
  const summary = summarizeLedger([
    {
      id: "hall", group: "본식", name: "웨딩홀", budget: 20_000_000, contractAmount: 21_000_000, status: "reserved",
      payments: [
        { label: "예약금", amount: 2_000_000, dueDate: "2026-01-10", done: true },
        { label: "잔금", amount: 19_000_000, dueDate: "2027-05-01", done: false },
      ],
    },
    {
      id: "snap", group: "본식", name: "본식 스냅", budget: 600_000, contractAmount: 500_000, status: "reserved",
      payments: [{ label: "잔금", amount: 100_000, dueDate: "2027-04-20", done: false }],
    },
    { id: "hanbok", group: "본식", name: "혼주 한복", budget: 1_000_000, contractAmount: null, status: "searching", payments: [] },
  ]);
  assert.equal(summary.budgetTotal, 21_600_000);
  assert.equal(summary.expectedTotal, 22_500_000);
  assert.equal(summary.paidTotal, 2_000_000);
  assert.equal(summary.remainingTotal, 19_000_000 + 500_000);
  assert.deepEqual(summary.overBudget, [{ entryId: "hall", name: "웨딩홀", over: 1_000_000 }]);
  assert.deepEqual(summary.upcoming.map((p) => p.entryId), ["snap", "hall"]);
  assert.equal(daysUntil("2027-05-01", "2027-04-20"), 11);
  assert.throws(
    () => summarizeLedger([{ id: "x", group: "g", name: "x", budget: -1, contractAmount: null, status: "searching", payments: [] }]),
    RangeError,
  );
});

test("parseLedger: 손상된 저장값은 버리고 정상 항목만 남긴다", async () => {
  const { parseLedger } = await import("./index.ts");
  const good = { id: "a", group: "모르는분류", name: "웨딩홀", budget: 100, contractAmount: null, status: "searching", payments: [] };
  const parsed = parseLedger([
    good,
    null,
    {},
    { ...good, id: "b", budget: -1 },
    { ...good, id: "c", status: "hacked" },
    { ...good, id: "d", payments: [{ label: "잔금", amount: 1, dueDate: "2026-02-31", done: false }, null] },
    { ...good, id: "a", name: "중복" },
    { ...good, id: "e", budget: 1e308 },
    { ...good, id: "f", name: "   " },
  ]);
  assert.deepEqual(parsed.map((e) => e.id), ["a", "d"]);
  assert.equal(parsed[0].name, "웨딩홀");
  assert.deepEqual(parsed[1].payments, []);
  assert.equal(parsed[0].group, "기타");
  assert.deepEqual(parseLedger("nope"), []);
});

test("parseHallBoard: 깨진 홀은 빼고, 사진은 https만, 최대 5곳", async () => {
  const { parseHallBoard, isDateString } = await import("./index.ts");
  const hall = { id: "a", name: "홀", mealPerPerson: 50_000, rental: 1_000_000, guaranteedGuests: 100, photo: "blob:x" };
  const board = parseHallBoard({
    region: "seoul-gangnam",
    guests: 150,
    halls: [hall, { ...hall }, { ...hall, id: "b", rental: -1 }, { ...hall, id: "c", photo: "https://img/1" }, ...["d", "e", "f", "g"].map((id) => ({ ...hall, id }))],
  });
  assert.ok(board);
  assert.deepEqual(board.halls.map((h) => h.id), ["a", "c", "d", "e", "f"]);
  assert.equal(board.halls[0].photo, null);
  assert.equal(board.halls[1].photo, "https://img/1");
  assert.equal(parseHallBoard({ region: "mars", guests: 1, halls: [] }), null);
  assert.equal(parseHallBoard({ region: "jeju", guests: 1.5, halls: [] }), null);
  assert.equal(parseHallBoard([]), null);
  assert.equal(isDateString("2027-02-29"), false);
  assert.equal(isDateString("2028-02-29"), true);
});
