/**
 * 위기 신호 점검 (규칙 기반, LLM과 분리). 보수적으로 판정하며 오탐을 감수한다.
 * 위기로 판정되면 호출자는 쿠폰·진로 안내를 모두 중단하고 고정 안내문을 보여줘야 한다.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /죽고\s*싶/,
  /죽을\s*(래|까|것\s*같)/,
  /자살/,
  /자해/,
  /목숨/,
  /사라지고\s*싶/,
  /살기\s*싫/,
  /살고\s*싶지\s*않/,
  /끝내고\s*싶/,
  /극단적/,
  /더\s*이상\s*못\s*버티/,
];

export interface CrisisResult {
  crisis: boolean;
  matched: string[];
}

export function crisisCheck(text: string): CrisisResult {
  const matched = CRISIS_PATTERNS.filter((r) => r.test(text)).map((r) => r.source);
  return { crisis: matched.length > 0, matched };
}

/** LLM이 생성하지 않는 고정 안내문 */
export const CRISIS_MESSAGE = {
  title: "지금 많이 힘드시군요. 혼자 견디지 않으셨으면 해요.",
  body: "지금 바로 전문 상담사와 이야기할 수 있어요. 24시간 무료이고 비밀이 보장돼요.",
  actions: [
    { label: "자살예방 상담전화 109", tel: "109" },
    { label: "긴급할 때 119", tel: "119" },
  ],
} as const;
