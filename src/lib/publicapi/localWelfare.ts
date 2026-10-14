import "server-only";
import type { Region } from "@/lib/regions";
import { asArray, callDataGoKr, findValue, str, type ApiResult } from "./datagokr";

const LIST_URL =
  "https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist";

export interface LocalWelfareItem {
  id: string;
  name: string;
  summary: string;
  area: string; // 예: "대전광역시" 또는 "대전광역시 서구"
  dept: string; // 담당 부서
  applyMethod: string; // 방문, 인터넷 등
  supportType: string;
  link: string;
  updated: string; // 최종 수정일 YYYYMMDD
}

const BOKJIRO = "https://www.bokjiro.go.kr";
const norm = (s: string) => s.replace(/\s/g, "");

/**
 * 키워드별 관련 없는 결과를 걸러 내는 규칙. 지자체 API는 단어가 들어간 모든 제도를 주기 때문에
 * 자립청년에게 맞는 것만 남긴다. (예: '문화'는 다문화가족 제도가 많이 섞임)
 */
const KEEP: Record<string, RegExp> = {
  문화: /문화(누리|예술|이용권|바우처|패스|생활|향유|체험|활동)|공연|전시|관람|예술/,
  생필품: /생필품|생활용품|꾸러미|식료품|식품|먹거리|푸드|나눔|물품|긴급/,
  식품: /식품|식료품|먹거리|푸드|급식|도시락|반찬|쌀|양곡|바우처/,
};
const DROP = /장애|노인|어르신|다문화|이주배경|이주민|이주노동|외국인|영유아|임산부|출산|보육|아동\s*급식/;

/**
 * 사는 곳(시도·시군구)에서 자체 운영하는 복지서비스를 찾는다.
 * 시도 단위로 조회한 뒤 시도 전체 제도와 사용자의 시군구 제도만 남긴다.
 * (시군구 필터를 API에 걸면 시도 단위로 등록된 청년 제도가 빠지기 때문)
 */
export async function searchLocalWelfareByArea(
  sidoApiName: string,
  sigungu: string,
  keyword: string,
  limit = 6,
): Promise<ApiResult<LocalWelfareItem[]>> {
  const source = {
    name: `한국사회보장정보원 지자체 복지서비스 (${sidoApiName})`,
    url: BOKJIRO,
    fetchedAt: new Date().toISOString(),
  };
  const r = await callDataGoKr(LIST_URL, {
    pageNo: "1",
    numOfRows: "100",
    srchKeyCode: "003",
    searchWrd: keyword,
    ctpvNm: sidoApiName,
  });
  if (!r.ok) return { status: "unavailable", reason: r.reason, source };

  const sg = norm(sigungu);
  const keep = KEEP[keyword];
  const items = asArray(findValue(r.data, "servList"))
    .filter((s) => {
      const sgg = norm(str(s.sggNm));
      const areaOk = sgg === "" || sg === "" || sg === sgg || sg.includes(sgg) || sgg.includes(sg);
      return str(s.ctpvNm) === sidoApiName && areaOk;
    })
    .map((s) => ({
      id: str(s.servId),
      name: str(s.servNm),
      summary: str(s.servDgst),
      area: [str(s.ctpvNm), str(s.sggNm)].filter(Boolean).join(" "),
      dept: str(s.bizChrDeptNm),
      applyMethod: str(s.aplyMtdNm),
      supportType: str(s.srvPvsnNm),
      link: str(s.servDtlLink) || BOKJIRO,
      updated: str(s.lastModYmd),
    }))
    .filter((i) => i.name && !DROP.test(i.name))
    .filter((i) => !keep || keep.test(`${i.name} ${i.summary}`))
    // 사용자의 시군구 제도를 시도 전체 제도보다 먼저 보여준다
    .sort((a, b) => Number(b.area.includes(" ")) - Number(a.area.includes(" ")))
    .slice(0, limit);

  return { status: "ok", items, source };
}

/** 데모 지원 지역(Region) 기준 조회 — 생활비 계산 화면에서 사용 */
export function searchLocalWelfare(region: Region, keyword: string, limit = 6) {
  return searchLocalWelfareByArea(region.sido, region.sgg, keyword, limit);
}
