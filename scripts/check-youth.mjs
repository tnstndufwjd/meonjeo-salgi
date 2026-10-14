// 온통청년 API 검증 (YOUTH_API_KEY 필요): node --no-warnings scripts/check-youth.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
assert.ok(env.YOUTH_API_KEY, "YOUTH_API_KEY 가 .env.local 에 없습니다");

async function page(n) {
  const u = new URL("https://www.youthcenter.go.kr/go/ythip/getPlcy");
  u.searchParams.set("apiKeyNm", env.YOUTH_API_KEY); u.searchParams.set("pageNum", String(n));
  u.searchParams.set("pageSize", "500"); u.searchParams.set("rtnType", "json");
  return (await fetch(u)).json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
let total = 0;
for (let n = 1; n <= 12; n++) {
  const j = await page(n);
  assert.equal(j.resultCode, 200, `쪽 ${n}: ${j.resultMessage}`);
  total = j.result.pagging.totCount;
  rows.push(...j.result.youthPolicyList);
  if (rows.length >= total) break;
  await sleep(400);
}
assert.equal(rows.length, total, "전체 건수와 받은 건수가 같다 (빠짐 없음)");
assert.equal(new Set(rows.map((p) => p.plcyNo)).size, total, "정책번호 중복 없음");
assert.ok(total >= 1000, "정책이 충분히 많다");

// 앱이 가정하는 코드·필드가 그대로인지
for (const f of ["plcyNm", "lclsfNm", "aplyPrdSeCd", "aplyYmd", "bizPrdEndYmd", "zipCd", "sprtTrgtAgeLmtYn", "earnCndSeCd", "plcySprtCn"]) {
  assert.ok(f in rows[0], `필드 ${f}`);
}
const codes = new Set(rows.map((p) => p.aplyPrdSeCd));
for (const c of codes) assert.ok(["0057001", "0057002", "0057003"].includes(c), `예상 못 한 신청기간 코드 ${c}`);
assert.ok(rows.every((p) => (p.zipCd ?? "").trim() !== ""), "모든 정책에 지역 코드가 있다");

// 자립준비청년 대상 정책이 실제로 들어 있다
const re = /자립준비|보호종료/;
const foster = rows.filter((p) => re.test(`${p.plcyNm} ${p.plcyExplnCn}`));
assert.ok(foster.length >= 10, `자립준비·보호종료 정책 ${foster.length}건`);
assert.ok(foster.some((p) => p.plcyNm.includes("자립수당")), "자립수당 정책이 있다");
console.log(`OK: youth policy checks passed. 전체 ${total}건, 자립준비·보호종료 ${foster.length}건`);
