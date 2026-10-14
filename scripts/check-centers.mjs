// 고용센터 찾기 검증: node --no-warnings scripts/check-centers.mjs
import assert from "node:assert/strict";
import { findCenters, SIDO_LIST } from "../src/lib/centers.ts";
import data from "../src/data/employment-centers.json" with { type: "json" };

const names = (r) => r.centers.map((c) => `${c.name}(${c.match})`);

// 데이터 무결성: 고용24 목록은 133개 기관
const all = data.centers;
assert.equal(all.length, 133);
assert.equal(new Set(all.map((c) => c.name)).size, 133, "기관명 중복 없음");
for (const c of all) {
  assert.match(c.tel, /^\d{2,4}-\d{3,4}-\d{4}(~\d+)?$/, "전화 형식: " + c.name);
  assert.ok(c.addr.length > 6 && c.sido && c.sgg, "주소 필드: " + c.name);
}
assert.equal(SIDO_LIST.length, 17);

// 같은 구에 있는 센터
const daejeon = findCenters("대전", "서구");
assert.deepEqual(names(daejeon), ["대전고용센터(location)"]);
assert.equal(daejeon.scope, "district");

// 이름으로 관할 추정: 서울관악고용센터는 구로구에 있지만 관악구 청년에게 안내해야 함
const gwanak = findCenters("서울", "관악구");
assert.ok(names(gwanak).includes("서울관악고용센터(name)"), "관악구 -> 서울관악고용센터");
assert.match(gwanak.centers[0].addr, /구로구/, "실제 위치는 구로구");

// 같은 시, 다른 구: 수원시 영통구 -> 수원고용센터(팔달구)
const suwon = findCenters("경기", "수원시 영통구");
assert.ok(names(suwon).includes("수원고용센터(city)"), "수원시 영통구 -> 수원고용센터");
assert.equal(suwon.scope, "district");

// 한 글자 구 이름("서구", "중구")은 이름 일치로 오탐하지 않음
const jung = findCenters("부산", "중구");
assert.ok(!jung.centers.some((c) => c.match === "name"), "중구 이름 오탐 없음");

// 시군구를 모르면 같은 시도 목록
const noGu = findCenters("부산", "");
assert.equal(noGu.scope, "sido");
assert.ok(noGu.centers.length >= 1);

// 광주/전남은 통합 데이터에서 찾음
assert.ok(findCenters("광주", "북구").centers.some((c) => c.name === "광주고용센터"));
assert.ok(findCenters("전남", "순천시").centers.some((c) => c.name === "순천고용센터"));

// 데이터에 없는 지역
assert.equal(findCenters("제주", "제주시").scope, "none");

// 홈페이지 주소는 있으면 https 로 시작
assert.ok(all.filter((c) => c.home).every((c) => c.home.startsWith("https://")));

console.log("OK: employment center lookup checks passed (", all.length, "centers)");
