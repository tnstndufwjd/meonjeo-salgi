/** 상담 캐릭터 설정. 이름·문구를 바꾸려면 여기만 고치면 된다. */
export const CHARACTER = {
  name: "든든",
  title: "AI 자립 선배",
  avatar: "/character/avatar.webp",
  full: "/character/full.webp",
  greeting: [
    "안녕! 나는 든든이야. 혼자 생활을 시작한 친구들 옆에서 필요한 걸 같이 찾아주는 AI 선배야.",
    "돈, 집, 일자리, 배우고 싶은 것… 뭐든 편하게 말해 줘. 받을 수 있는 지원이 있는데 모르고 지나가는 일이 없도록 내가 대신 찾아볼게.",
  ],
} as const;

/** 자립에 필요한 네 가지 영역. 상담에서 하나도 놓치지 않도록 화면에 표시한다. */
export const PILLARS = [
  { id: "living", label: "생활비", ask: "생활비 지원받을 수 있는 게 있을까?" },
  { id: "housing", label: "주거", ask: "월세나 집 구하는 데 도움받을 수 있는 게 있을까?" },
  { id: "job", label: "일자리", ask: "나한테 맞는 일자리 지원도 알려줘" },
  { id: "edu", label: "교육", ask: "무료로 배울 수 있는 교육이나 직업훈련도 알려줘" },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];
