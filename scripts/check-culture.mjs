// 문화 행사 API 검증 (data.go.kr 인증키와 '한눈에보는문화정보조회서비스' 승인 필요): node --no-warnings scripts/check-culture.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const B = "https://apis.data.go.kr/B553457/cultureinfo";
const K = env.DATA_GO_KR_KEY;
const day = (p) => new Date(Date.now() + 9 * 3600e3 + p * 86400e3).toISOString().slice(0, 10).replace(/-/g, "");
const get = async (path, q) => (await fetch(`${B}/${path}?serviceKey=${K}&${new URLSearchParams(q)}`)).text();
const total = (x) => Number((x.match(/<totalCount>(\d+)/) || [])[1]);

// 시군구 필터는 sigungu 파라미터만 적용된다 (gugunNm 등은 무시됨)
const base = { PageNo: "1", numOfrows: "50", from: day(0), to: day(30), sido: "경기" };
const all = total(await get("area2", base));
const seongnam = total(await get("area2", { ...base, sigungu: "성남시" }));
const ignored = total(await get("area2", { ...base, gugunNm: "성남시" }));
assert.ok(seongnam > 0 && seongnam < all, "sigungu 로 거르면 줄어든다");
assert.equal(ignored, all, "gugunNm 은 적용되지 않는다");

// 상세에는 가격과 링크가 있다
const list = await get("area2", { ...base, sido: "서울", numOfrows: "3" });
const seq = (list.match(/<seq>(\d+)/) || [])[1];
const det = await get("detail2", { seq });
assert.match(det, /<price>/, "상세에 가격 항목이 있다");
console.log("OK: culture API checks passed (경기", all, "건 / 성남시", seongnam, "건)");
