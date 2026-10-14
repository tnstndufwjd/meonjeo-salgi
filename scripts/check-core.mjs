// 핵심 로직 검증: node scripts/check-core.mjs
import assert from "node:assert/strict";
import { calcScenarios } from "../src/lib/scenario.ts";
import { crisisCheck } from "../src/lib/crisis.ts";
import { DEMO_PERSONA } from "../src/lib/profile.ts";

const [keep, train, move] = calcScenarios(DEMO_PERSONA);

// 유지: 소득 120 - 지출(40+18+45=103) = 월 +17만, 3개월 후 60+51=111만
assert.equal(keep.months[0].net, 170_000);
assert.equal(keep.endBalance, 1_110_000);
assert.equal(keep.shortfallMonth, null);

// 훈련: 1~2개월 소득 72만 -> 월 -31만, 3개월 소득 200만 -> +97만
assert.equal(train.months[0].income, 720_000);
assert.equal(train.months[0].net, -310_000);
assert.equal(train.months[2].net, 970_000);
assert.equal(train.endBalance, 600_000 - 310_000 * 2 + 970_000);
// 저축 60만 - 31만 = 29만(1개월), 29만 - 31만 = -2만(2개월) -> 2개월 차 부족
assert.equal(train.months[1].balance, -20_000);
assert.equal(train.shortfallMonth, 2);

// 주거: 지출 103 - 40 + 25 = 88만, 첫 달 이사비 30만
assert.equal(move.months[0].expense, 880_000 + 300_000);
assert.equal(move.months[1].net, 1_200_000 - 880_000);

// 저축이 부족한 경우 부족 달 감지
const poor = calcScenarios({ ...DEMO_PERSONA, savings: 100_000, monthlyIncome: 900_000 });
assert.equal(poor[0].shortfallMonth, 1);

// 위기 신호
assert.equal(crisisCheck("월세 내고 나니 식비가 없어").crisis, false);
assert.equal(crisisCheck("요즘 너무 힘들어서 죽고 싶어").crisis, true);
assert.equal(crisisCheck("더 이상 못 버티겠어").crisis, true);

console.log("OK: scenario / crisis checks passed");
