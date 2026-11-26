import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * 세션 없이 공개 데이터(지역 평균, 추가금 목록)만 읽는 클라이언트.
 * 쿠키를 쓰지 않으므로 "use cache" 함수 안에서 쓸 수 있다.
 */
export function createPublicClient() {
  const { url, publishableKey } = supabaseEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
