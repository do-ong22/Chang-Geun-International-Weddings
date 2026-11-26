import { Mail } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function InvitationPage() {
  return (
    <ComingSoon
      title="청첩장"
      icon={Mail}
      summary="웨딩홀 분위기에 맞춘 모바일 청첩장"
    />
  );
}
