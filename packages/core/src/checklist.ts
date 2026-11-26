import type { FeeCategory } from "./extra-fee.ts";

export interface ChecklistItem {
  id: string;
  name: string;
}

/**
 * 견적에 포함됐는지 상담 때 확인해야 하는 흔한 추가금 항목.
 * 실제 결혼 준비 기록에서 자주 빠졌던 항목을 모았다(업체·금액 정보는 넣지 않는다).
 * ponytail: 금액은 출처 있는 자료가 생기면 extra_fee 테이블로 옮겨 예상 최대 금액을 계산한다.
 */
export const EXTRA_FEE_CHECKLIST: Record<FeeCategory, readonly ChecklistItem[]> = {
  studio: [
    { id: "studio-raw", name: "원본 사진 데이터" },
    { id: "studio-retouch", name: "수정본 추가" },
    { id: "studio-album", name: "앨범 페이지 추가" },
    { id: "studio-helper", name: "촬영 헬퍼" },
    { id: "studio-bouquet", name: "촬영용 부케" },
    { id: "studio-outdoor", name: "야외·야간 촬영" },
  ],
  dress: [
    { id: "dress-fitting", name: "드레스 피팅비" },
    { id: "dress-helper", name: "본식 헬퍼(이모님)" },
    { id: "dress-second", name: "2부 드레스" },
    { id: "dress-upgrade", name: "라인·라벨 업그레이드" },
    { id: "dress-groom", name: "신랑 예복 대여·맞춤" },
  ],
  makeup: [
    { id: "makeup-early", name: "얼리스타트(이른 시간)" },
    { id: "makeup-travel", name: "출장비" },
    { id: "makeup-hair-change", name: "헤어 변형" },
    { id: "makeup-parents", name: "혼주 메이크업" },
    { id: "makeup-nail", name: "염색·네일" },
  ],
  hall: [
    { id: "hall-flower", name: "꽃장식 업그레이드" },
    { id: "hall-production", name: "연출·음향" },
    { id: "hall-over-guests", name: "보증 인원 초과 식대" },
    { id: "hall-parents-meal", name: "혼주 식사 포함 인원" },
    { id: "hall-pyebaek", name: "폐백실" },
    { id: "hall-parking", name: "하객 주차 시간" },
  ],
};

export interface DiscountTip {
  id: string;
  title: string;
  /** 계약 전에 확인할 조건 */
  check: string;
}

/** 업체가 먼저 말해 주지 않는 할인. 조건이 붙는 경우가 많아 확인할 점을 함께 둔다. */
export const DISCOUNT_TIPS: readonly DiscountTip[] = [
  { id: "same-day", title: "당일 계약 할인", check: "상담 당일만 적용. 견적서부터 받아 두기" },
  { id: "contract-review", title: "계약 후기 작성", check: "작성 기한, 게시 유지 기간(예: 6개월)" },
  { id: "shoot-review", title: "촬영 후기 작성", check: "본식·촬영 후 작성 기한" },
  { id: "portrait", title: "초상권(SNS 게시) 동의", check: "홍보에 쓰이는 사진·영상 범위" },
  { id: "bundle", title: "결합 할인", check: "사진+영상처럼 같은 업체 묶음 계약" },
  { id: "referral", title: "추천인 코드·SNS 팔로우", check: "다른 할인과 중복 적용 여부" },
  { id: "gift-card", title: "상품권 결제", check: "상견례·식사를 할인 구매한 상품권으로 결제 가능한지" },
];
