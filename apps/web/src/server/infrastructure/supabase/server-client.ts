import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/**
 * 로그인한 사용자의 세션(쿠키)으로 동작하는 클라이언트.
 * 커플 데이터처럼 RLS로 보호되는 테이블은 이 클라이언트로 읽는다.
 * 요청마다 새로 만들어야 한다(@supabase/ssr SetAllCookies 문서).
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // 두 번째 인자(no-store 캐시 헤더)는 next/headers로 응답 헤더를 쓸 수 없어 받지 않는다.
      // 토큰 갱신은 모든 요청(Server Action POST 포함)에서 proxy가 먼저 하고,
      // proxy(update-session.ts)는 그 헤더를 응답에 붙인다. 여기서 갱신이 일어나는 경우는 드물다.
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy가 맡는다.
        }
      },
    },
  });
}
