import "server-only";

// Next.js Data Security 가이드: process.env는 데이터 접근 계층에서만 읽는다.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`환경 변수 ${name}가 없습니다. apps/web/.env.example을 참고하세요.`);
  return value;
}

export function supabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
