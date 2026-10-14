/**
 * 데모 지원 지역.
 * - lawd: 법정동코드 앞 5자리(시군구), 실거래가 API의 LAWD_CD
 * - sido / sgg: 지자체복지서비스 API의 ctpvNm / sggNm 값
 * - gu: 시 아래 구(수원시 영통구 등). 고용센터 찾기에서 사용
 * 2026-10-09 확인: 아래 9개 지역 모두 연립다세대 응답의 동 이름이 해당 구와 일치.
 * 광주(29xxx)는 2026년 전 기간 0건이라 제외. 고용24 목록에 '전남광주통합특별시'가 나오는 것으로 보아
 * 2026년 광주·전남 통합으로 행정구역 코드가 바뀐 것으로 추정되나 확인하지는 못했다.
 */
export interface Region {
  name: string;
  lawd: string;
  sido: string;
  sgg: string;
  gu?: string;
}

export const REGIONS: Region[] = [
  { name: "서울 관악구", lawd: "11620", sido: "서울특별시", sgg: "관악구" },
  { name: "부산 부산진구", lawd: "26230", sido: "부산광역시", sgg: "부산진구" },
  { name: "대구 수성구", lawd: "27260", sido: "대구광역시", sgg: "수성구" },
  { name: "인천 남동구", lawd: "28200", sido: "인천광역시", sgg: "남동구" },
  { name: "대전 서구", lawd: "30170", sido: "대전광역시", sgg: "서구" },
  { name: "경기 수원시 영통구", lawd: "41117", sido: "경기도", sgg: "수원시", gu: "영통구" },
  { name: "경기 성남시 분당구", lawd: "41135", sido: "경기도", sgg: "성남시", gu: "분당구" },
  { name: "경기 성남시 수정구", lawd: "41131", sido: "경기도", sgg: "성남시", gu: "수정구" },
  { name: "경기 성남시 중원구", lawd: "41133", sido: "경기도", sgg: "성남시", gu: "중원구" },
];

export function regionOf(regionName: string): Region | undefined {
  return REGIONS.find((r) => r.name === regionName);
}

export function lawdOf(regionName: string): string | undefined {
  return regionOf(regionName)?.lawd;
}
