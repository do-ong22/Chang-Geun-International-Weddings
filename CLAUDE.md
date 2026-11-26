# 프로젝트 규칙

기획은 [docs/PLAN.md](docs/PLAN.md)를 따른다.

## 구조
- `packages/core`: 도메인. 계산 로직과 타입만 있는 순수 TypeScript. 웹과 앱이 공유한다. 프레임워크·DB 의존 금지.
- `apps/web`: Next.js 16 (App Router, Cache Components). 레이어는 아래 방향으로만 의존한다.
  - `src/app`, `src/components` (화면) → `src/server/container.ts`만 부른다.
  - `src/server/application` (유스케이스, DTO, `ports.ts` 인터페이스) → `@wedding/core`와 포트에만 의존.
  - `src/server/infrastructure` (Supabase 클라이언트, 저장소 구현) → 포트를 구현한다.
  - `src/server/container.ts` (조립 지점) → 구현을 골라 유스케이스에 주입한다.
- `supabase/migrations`: DB 스키마. 모든 테이블에 RLS를 켠다.

## 규칙
- Next.js 문법은 `apps/web/node_modules/next/dist/docs/`의 공식 문서를 먼저 읽고 따른다 (`apps/web/AGENTS.md`). Supabase는 `@supabase/ssr` 공식 패턴을 따른다.
- 서버 전용 모듈에는 `import "server-only"`. `process.env`는 `server/infrastructure`에서만 읽는다.
- Server Action 안에서는 항상 인증·인가를 다시 확인한다. 서버에서 사용자 확인은 `supabase.auth.getClaims()`.
- **코드를 바꾸면 턴을 끝내기 전에 반드시 `code-reviewer` 서브에이전트로 리뷰한다.** `.claude/settings.json`의 Stop 훅이 리뷰 안 된 변경을 막는다.

## 명령
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test` (루트에서)
