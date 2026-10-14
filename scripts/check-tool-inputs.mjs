// 도구 입력 검증 정규식이 띄어쓰기 있는 지역 이름을 받아들이는지 확인: node --no-warnings scripts/check-tool-inputs.mjs
// tools.ts 는 서버 전용 모듈이라 직접 불러오지 않고, 소스에서 sigungu 검증식을 꺼내 실제로 실행해 본다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("src/lib/agent/tools.ts", "utf8");
const lines = src.split("\n").filter((l) => /sigungu:\s*z\.string\(\)/.test(l));
assert.ok(lines.length >= 5, `sigungu 검증식을 찾지 못했습니다 (${lines.length}개)`);

for (const line of lines) {
  const m = line.match(/regex\((\/.*\/)\)/);
  assert.ok(m, `정규식을 읽지 못함: ${line.trim()}`);
  const re = new Function(`return ${m[1]}`)();
  // 반드시 통과해야 하는 입력 (띄어쓰기 포함, 빈 문자열)
  for (const ok of ["", "성남시", "성남시 분당구", "수원시 영통구", "관악구", "1구"]) {
    assert.ok(re.test(ok), `허용되어야 함: "${ok}" ← ${line.trim()}`);
  }
  // 막아야 하는 입력 (특수문자·스크립트)
  for (const bad of ["성남시;DROP", "<script>", "../etc", "성남시&x=1", "a,b"]) {
    assert.ok(!re.test(bad), `거부되어야 함: "${bad}" ← ${line.trim()}`);
  }
}
console.log(`OK: sigungu 입력 검증 ${lines.length}곳 모두 정상 (띄어쓰기 허용, 특수문자 거부)`);
