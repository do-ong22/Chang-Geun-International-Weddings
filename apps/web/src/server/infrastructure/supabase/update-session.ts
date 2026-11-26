import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 요청마다 Supabase 세션 토큰을 갱신하고 쿠키를 응답에 다시 쓴다.
 * proxy.ts에서만 호출한다. 권한 검사는 여기서 하지 않고 데이터 접근 계층에서 한다
 * (Next.js Proxy 문서: Proxy는 전체 인가 수단이 아니다).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Supabase 연결 전에는 갱신할 세션도 없다. 데이터가 필요한 페이지는 env.ts에서 오류를 낸다.
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // 세션 서버 검증과 토큰 갱신. getSession()은 서버에서 믿지 않는다(Supabase SSR 문서).
  await supabase.auth.getClaims();

  // setAll이 마지막으로 만든 response를 그대로 돌려줘야 쿠키가 유지된다.
  return response;
}
