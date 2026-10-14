import "server-only";
import { asArray, callDataGoKr, findValue, str, type ApiResult } from "./datagokr";

const LIST_URL =
  "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001";

export interface WelfareItem {
  id: string;
  name: string;
  summary: string;
  ministry: string; // 소관부처
  org: string; // 소관조직
  link: string; // 복지로 상세 링크 (없으면 복지로 메인)
  contact: string; // 대표 문의처
  onlineApply: boolean; // 복지로 온라인 신청 가능
  supportType: string; // 현금지급, 현물지급, 서비스 등
  targets: string; // 가구 상황 (저소득, 장애인 등)
}

const BOKJIRO = "https://www.bokjiro.go.kr";

/** 문화·식품 검색은 관련 없는 제도(다문화, 영유아 식품 등)가 많이 섞여 걸러 낸다. */
const KEEP: Record<string, RegExp> = {
  문화: /문화(누리|예술|이용권|바우처|패스|생활|향유|체험|활동)|공연|전시|관람/,
  식품: /식품|식료품|먹거리|급식|도시락|반찬|양곡|바우처|점심/,
};
const DROP = /장애|북한|다문화|이주배경|이주민|이주노동|외국인|노인|어르신|영유아|임산부|출산|임신|보육|학교우유|농업인|농어업|창업농|농촌/;

/** 자립준비청년과 직접 관련된 제도를 위로 올리는 단어 */
const PRIORITY = /자립준비|보호종료|자립수당|자립정착|가정\s*밖|아동복지시설|위탁/;

function score(w: WelfareItem): number {
  const text = `${w.name} ${w.summary}`;
  let s = 0;
  if (PRIORITY.test(text)) s += 10;
  if (/청년/.test(text)) s += 3;
  if (/장애/.test(text)) s -= 5; // 장애 대상 제도는 이 사용자군의 기본 안내에서 뒤로 보낸다
  return s;
}

/**
 * 키워드로 중앙부처 복지서비스를 찾아 청년 대상 제도만 골라 정렬한다.
 * 한 번의 호출로 여러 건을 받아 거르므로 하루 호출 한도(100건)를 아낀다. 자격 판정은 하지 않는다.
 */
export async function searchWelfare(keyword: string, limit = 5): Promise<ApiResult<WelfareItem[]>> {
  const source = {
    name: "한국사회보장정보원 중앙부처 복지서비스 (복지로)",
    url: BOKJIRO,
    fetchedAt: new Date().toISOString(),
  };
  const r = await callDataGoKr(LIST_URL, {
    callTp: "L",
    pageNo: "1",
    numOfRows: "30",
    srchKeyCode: "003", // 서비스명 + 내용
    searchWrd: keyword,
  });
  if (!r.ok) return { status: "unavailable", reason: r.reason, source };

  const jobSearch = keyword === "취업" || keyword === "직업훈련";
  const items = asArray(findValue(r.data, "servList"))
    .filter((s) => str(s.lifeArray).includes("청년"))
    // 일자리·훈련 검색은 실제 취업·훈련 제도만 남기고, 특정 대상 전용 제도는 뺀다.
    .filter((s) => {
      const kr = KEEP[keyword];
      if (kr) return kr.test(`${str(s.servNm)} ${str(s.servDgst)}`) && !DROP.test(str(s.servNm));
      if (!jobSearch) return true;
      const text = `${str(s.servNm)} ${str(s.servDgst)}`;
      return /취업|일자리|구직|훈련|고용|창업/.test(text) && !/장애|북한|다문화|노인|의사상자/.test(str(s.servNm));
    })
    .map((s) => ({
      id: str(s.servId),
      name: str(s.servNm),
      summary: str(s.servDgst),
      ministry: str(s.jurMnofNm),
      org: str(s.jurOrgNm),
      link: str(s.servDtlLink) || BOKJIRO,
      contact: str(s.rprsCtadr),
      onlineApply: str(s.onapPsbltYn) === "Y",
      supportType: str(s.srvPvsnNm),
      targets: str(s.trgterIndvdlArray),
    }))
    .filter((i) => i.name)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);

  return { status: "ok", items, source };
}
