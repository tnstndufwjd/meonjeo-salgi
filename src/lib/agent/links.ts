/** 공식 창구 링크 (고정값). 에이전트는 여기 있는 링크만 안내한다. */
export const OFFICIAL_LINKS = {
  jobs: {
    title: "고용24 채용정보",
    desc: "지역·직무별 채용 공고와 취업 지원 프로그램",
    href: "https://www.work24.go.kr",
  },
  training: {
    title: "국민내일배움카드 훈련과정",
    desc: "훈련비를 지원받는 직업훈련 과정 검색",
    href: "https://m.work24.go.kr/hr/a/a/1100/trnnCrsInf.do",
  },
  youth_policy: {
    title: "온통청년",
    desc: "주거·금융·일자리 청년정책을 지역별로 검색",
    href: "https://www.youthcenter.go.kr",
  },
  housing: {
    title: "마이홈포털",
    desc: "공공임대주택 공고와 주거 지원 안내",
    href: "https://www.myhome.go.kr",
  },
  welfare: {
    title: "복지로",
    desc: "복지서비스 검색과 온라인 신청",
    href: "https://www.bokjiro.go.kr",
  },
  legal: {
    title: "대한법률구조공단 (☎ 132)",
    desc: "임대차·임금체불 등 무료 법률상담",
    href: "https://www.klac.or.kr",
  },
  foodbank: {
    title: "전국푸드뱅크 (푸드마켓·푸드뱅크 찾기)",
    desc: "기부 식품·생필품을 나누는 곳. 내 지역 푸드마켓과 이용 방법을 찾아볼 수 있어요",
    href: "https://www.foodbank1377.org",
  },
  culture: {
    title: "문화포털",
    desc: "전국 공연·전시·문화행사 정보와 할인·무료 행사 찾기",
    href: "https://www.culture.go.kr",
  },
  mnuri: {
    title: "문화누리카드 누리집",
    desc: "통합문화이용권(문화누리카드) 신청과 가맹점 안내",
    href: "https://www.mnuri.kr",
  },
  youth_call: {
    title: "온통청년 전화상담 (☎ 1670-1839)",
    desc: "청년정책과 생활 고민을 전화로 상담 · 평일 09~18시",
    href: "tel:1670-1839",
  },
  counseling: {
    title: "정신건강 위기상담 (☎ 1577-0199)",
    desc: "마음이 힘들 때 24시간 상담",
    href: "tel:1577-0199",
  },
} as const;

export type LinkTopic = keyof typeof OFFICIAL_LINKS;
export const LINK_TOPICS = Object.keys(OFFICIAL_LINKS) as LinkTopic[];
