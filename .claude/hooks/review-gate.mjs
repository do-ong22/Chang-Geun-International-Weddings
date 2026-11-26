// 코드 리뷰 강제 훅.
//   node review-gate.mjs mark  ← SubagentStop: code-reviewer가 끝나면 지금 변경 상태를 "리뷰 완료"로 기록
//   node review-gate.mjs stop  ← Stop: 리뷰 안 된 코드 변경이 있으면 턴 종료를 막고 리뷰를 요구
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CODE_PATHS = ["apps", "packages", "supabase"];
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateFile = join(root, ".claude", ".review-state");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** 커밋 안 된 코드 변경 전체(수정 + 새 파일 내용)의 해시. 변경이 없으면 null */
function changeHash() {
  const diff = git(["diff", "HEAD", "--binary", "--", ...CODE_PATHS]);
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z", "--", ...CODE_PATHS])
    .split("\0")
    .filter(Boolean)
    .sort();
  if (!diff && untracked.length === 0) return null;
  const hash = createHash("sha256").update(diff);
  for (const file of untracked) hash.update(file).update(readFileSync(join(root, file)));
  return hash.digest("hex");
}

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

const mode = process.argv[2];
const input = readStdin();

if (mode === "mark") {
  // matcher가 code-reviewer로 거르지만, 입력에 에이전트 종류가 있으면 한 번 더 확인한다.
  if (input.agent_type && input.agent_type !== "code-reviewer") process.exit(0);
  writeFileSync(stateFile, changeHash() ?? "");
  process.exit(0);
}

if (mode === "stop") {
  const current = changeHash();
  if (current === null) process.exit(0);
  const reviewed = existsSync(stateFile) ? readFileSync(stateFile, "utf8").trim() : "";
  if (current === reviewed) process.exit(0);

  if (input.stop_hook_active) {
    // ponytail: 이미 한 번 막았는데도 리뷰가 안 됐으면 무한 반복을 피하려 종료는 허용하고 경고만 남긴다.
    console.log(JSON.stringify({ systemMessage: "⚠ 리뷰되지 않은 코드 변경이 남아 있습니다. code-reviewer 에이전트를 실행하세요." }));
    process.exit(0);
  }
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        "apps/, packages/, supabase/에 리뷰되지 않은 코드 변경이 있습니다. 턴을 끝내기 전에 code-reviewer 서브에이전트(Agent tool, subagent_type: code-reviewer)로 리뷰를 실행하고, 지적 사항을 고친 뒤 고친 내용도 다시 리뷰받으세요.",
    }),
  );
  process.exit(0);
}

console.error(`unknown mode: ${mode}`);
process.exit(1);
