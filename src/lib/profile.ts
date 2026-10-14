/** 대화·폼으로 수집해 구조화하는 청년 프로필 (모든 금액은 원/월). 데모는 가상 데이터만 사용. */
export interface YouthProfile {
  nickname: string;
  region: string; // 예: "대전 서구"
  monthsSinceLeaving: number; // 보호종료 후 경과 개월
  monthlyIncome: number;
  rent: number;
  otherFixedCosts: number; // 통신비, 교통비, 공과금 등
  livingCosts: number; // 식비 등 변동 생활비
  savings: number;
  debt: number;
  desiredJob?: string;
  certificates: string[];
}

/** 시연용 가상 페르소나 (실존 인물 아님) */
export const DEMO_PERSONA: YouthProfile = {
  nickname: "지윤",
  region: "대전 서구",
  monthsSinceLeaving: 6,
  monthlyIncome: 1_200_000,
  rent: 400_000,
  otherFixedCosts: 180_000,
  livingCosts: 450_000,
  savings: 600_000,
  debt: 0,
  desiredJob: "사무보조",
  certificates: [],
};
