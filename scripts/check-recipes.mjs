// 레시피 검색 검증 (식품안전나라 인증키 필요): node --no-warnings scripts/check-recipes.mjs
// 서버 전용 모듈이라 같은 로직을 응답 JSON에 직접 적용해 확인한다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const key = env.FOODSAFETY_KEY;
assert.ok(key, "FOODSAFETY_KEY 가 .env.local 에 없습니다");

const get = async (range) =>
  (await (await fetch(`https://openapi.foodsafetykorea.go.kr/api/${key}/COOKRCP01/json/${range}`)).json()).COOKRCP01;
const a = await get("1/1000");
const b = await get("1001/2000");
const rows = [...a.row, ...b.row];
assert.equal(rows.length, Number(a.total_count), "전체 건수가 total_count 와 같음");

// recipes.ts 와 같은 재료 세기
const UNIT = "g|ml|mL|㎖|cc|개|큰술|작은술|컵|스푼|쪽|줄기|장|마리|모|봉|알|조각|꼬집|꼭지|뿌리|포기|단|통";
const PAIR = new RegExp(`[가-힣]+\\s*\\(?\\s*\\d+(?:[./]\\d+)?\\s*(?:${UNIT})`, "g");
const count = (t) => (t.match(PAIR) || []).length || t.split(/[,\n]/).filter((x) => x.trim()).length;

const scone = rows.find((r) => r.RCP_NM === "미숫가루 스콘");
assert.equal(count(scone.RCP_PARTS_DTLS), 9, "스콘은 재료 9개 (괄호 방식은 1개로 틀렸음)");
const sam = rows.find((r) => r.RCP_NM === "삼겹살라면");
assert.ok(count(sam.RCP_PARTS_DTLS) <= 8, "삼겹살라면은 간단 기준(재료 8개 이하)");

// 라면을 쓰는 레시피 중 간단한 것이 존재해야 함
const simpleRamen = rows.filter((r) => `${r.RCP_NM} ${r.RCP_PARTS_DTLS}`.includes("라면")).filter((r) => {
  const steps = Array.from({ length: 20 }, (_, i) => r["MANUAL" + String(i + 1).padStart(2, "0")]).filter(Boolean).length;
  return count(r.RCP_PARTS_DTLS) <= 8 && steps <= 6;
});
assert.ok(simpleRamen.length >= 1);
console.log("OK: recipes checks passed. 전체", rows.length, "건, 라면 간단 레시피:", simpleRamen.map((r) => r.RCP_NM).join(", "));
