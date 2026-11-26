import { CalendarCheck } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SchedulePage() {
  return (
    <ComingSoon
      title="일정"
      icon={CalendarCheck}
      summary="예식일 기준 할 일 · 둘이 나눠 체크"
    />
  );
}
