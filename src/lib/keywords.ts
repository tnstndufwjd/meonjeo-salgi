import type { PillarId } from "./character";

/**
 * 중앙부처 복지서비스 검색 키워드 (허용 목록).
 * '교육'은 2026-10-09 확인 결과 생리용품·유치원비 등 무관한 결과가 대부분이라 제외.
 */
export const WELFARE_KEYWORDS = ["자립", "청년", "생계", "주거", "취업", "직업훈련", "심리", "식품", "문화누리", "문화"] as const;

/** 지자체 복지서비스 검색 키워드 (허용 목록) */
export const LOCAL_KEYWORDS = ["청년", "자립", "주거", "월세", "취업", "생필품", "식품", "문화"] as const;

/** 검색 키워드가 어느 자립 영역을 다루는지 */
export const KEYWORD_PILLAR: Record<string, PillarId | undefined> = {
  자립: "living",
  청년: "living",
  생계: "living",
  주거: "housing",
  월세: "housing",
  취업: "job",
  직업훈련: "edu",
  식품: "living",
  생필품: "living",
};
