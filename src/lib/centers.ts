import data from "../data/employment-centers.json" with { type: "json" };

/**
 * 고용센터(고용복지+센터) 찾기. 데이터는 고용24 '고용센터 조회' 목록의 스냅샷이다.
 * 좌표가 없어 '가장 가까운 순'을 거리로 계산하지는 못하고, 사용자가 고른 지역과의
 * 행정구역 일치도로 정렬한다. 관할 구역은 센터마다 달라 전화로 확인하도록 안내한다.
 */
export interface EmploymentCenter {
  name: string;
  zip: string;
  addr: string;
  detail: string;
  tel: string;
  home: string;
  sido: string;
  sgg: string;
  sgg2: string;
}

export const SIDO_LIST = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;
export type Sido = (typeof SIDO_LIST)[number];

/** 2026년 광주·전남 통합으로 데이터상 시도명이 하나로 합쳐져 있다. */
const DATA_SIDO: Record<Sido, string> = {
  서울: "서울", 부산: "부산", 대구: "대구", 인천: "인천",
  광주: "전남광주통합특별시", 대전: "대전", 울산: "울산", 세종: "세종",
  경기: "경기", 강원: "강원", 충북: "충북", 충남: "충남", 전북: "전북",
  전남: "전남광주통합특별시", 경북: "경북", 경남: "경남", 제주: "제주",
};

const FULL_TO_SHORT: Record<string, Sido> = {
  서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종",
  경기도: "경기", 강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
  전북특별자치도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남",
  제주특별자치도: "제주",
};
export const shortSido = (full: string): Sido | undefined => FULL_TO_SHORT[full];

export type CenterScope = "district" | "sido" | "none";

export interface CenterResult {
  sido: string;
  sigungu: string;
  scope: CenterScope;
  /** 지역 일치 방식: 같은 구에 있음 / 같은 시에 있음 / 이름으로 추정되는 관할 / 같은 시도 */
  centers: (EmploymentCenter & { match: "location" | "city" | "name" | "sido"; mapUrl: string })[];
}

const all = data.centers as EmploymentCenter[];
export const CENTERS_SOURCE = {
  name: data.source,
  url: data.sourceUrl,
  fetchedAt: data.fetchedAt,
  note: data.note,
};

const norm = (s: string) => s.replace(/\s/g, "");
const mapUrl = (c: EmploymentCenter) =>
  `https://map.kakao.com/link/search/${encodeURIComponent(`${c.addr.split("(")[0].trim()} ${c.name}`)}`;

export function findCenters(sido: Sido, sigungu = ""): CenterResult {
  const pool = all.filter((c) => c.sido === DATA_SIDO[sido]);
  const base = { sido, sigungu };
  if (pool.length === 0) return { ...base, scope: "none", centers: [] };

  const sg = norm(sigungu);
  const picked = new Map<string, CenterResult["centers"][number]>();
  const add = (c: EmploymentCenter, match: "location" | "city" | "name" | "sido") => {
    if (!picked.has(c.name)) picked.set(c.name, { ...c, match, mapUrl: mapUrl(c) });
  };

  if (sg.length >= 2) {
    // 1) 같은 시군구에 있는 센터
    for (const c of pool) {
      const keys = [c.sgg, c.sgg2, c.sgg + c.sgg2].filter(Boolean);
      if (keys.some((k) => sg === k || (c.sgg2 && sg.includes(c.sgg2)))) add(c, "location");
    }
    // 1-2) 같은 시에 있는 센터 (예: 수원시 영통구 → 수원시 팔달구의 수원고용센터)
    for (const c of pool) if (/시$/.test(c.sgg) && sg.includes(c.sgg)) add(c, "city");
    // 2) 이름에 지역명이 들어간 센터 (예: 서울관악고용센터는 구로구에 있지만 관악 관할)
    const stem = sg.replace(/(특별자치시|시|군|구)$/, "");
    if (stem.length >= 2) for (const c of pool) if (c.name.includes(stem)) add(c, "name");
  }

  if (picked.size > 0) return { ...base, scope: "district", centers: [...picked.values()] };

  // 3) 못 찾으면 같은 시도의 센터를 보여준다
  for (const c of pool.slice(0, 8)) add(c, "sido");
  return { ...base, scope: "sido", centers: [...picked.values()] };
}
