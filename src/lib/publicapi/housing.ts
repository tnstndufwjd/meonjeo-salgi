import "server-only";
import type { Sido } from "@/lib/centers";
import { SIDO_API_NAME } from "@/lib/sido";
import { asArray, callDataGoKr, findValue, str, type ApiResult } from "./datagokr";

/**
 * 한국토지주택공사 분양임대공고문 조회 서비스 (data.go.kr B552555/lhLeaseNoticeInfo1).
 * 2026-10-09 확인한 사실:
 * - UPP_AIS_TP_CD: 06=임대주택(국민임대·행복주택·영구임대·공공임대·통합공공임대), 13=주거복지(매입임대·집주인임대)
 * - CNP_CD: 지역. 서울11 부산26 대구27 인천28 광주29 대전30 울산31 세종36 경기41 충북43 충남44 전남46
 *   경북47 경남48 제주50 강원51 전북52. (광주·전남은 통합돼 이름이 같아졌지만 코드는 각각 유효)
 * - PAN_SS(상태): 공고중, 접수중, 정정공고중, 접수마감, 상담요청. 마감된 공고도 함께 내려오므로 걸러 쓴다.
 * - 이 API는 공고 목록만 준다. 신청 자격(소득·자산·연령 등)은 공고문 본문에 있어 판정하지 않는다.
 */
const URL_ = "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
const SOURCE = { name: "한국토지주택공사 분양임대공고 (LH청약플러스)", url: "https://apply.lh.or.kr" };

const CNP: Record<Sido, string> = {
  서울: "11", 부산: "26", 대구: "27", 인천: "28", 광주: "29", 대전: "30", 울산: "31", 세종: "36",
  경기: "41", 강원: "51", 충북: "43", 충남: "44", 전북: "52", 전남: "46", 경북: "47", 경남: "48", 제주: "50",
};

const OPEN = new Set(["공고중", "접수중", "정정공고중"]);
/** 임대주택(06) 분류에 섞여 오는, 주거와 무관한 공고 (가정어린이집 운영자 모집 등) */
const NOT_HOUSING = /어린이집|운영예정자|운영자s*모집/;

export interface HousingNotice {
  id: string;
  title: string;
  region: string;
  type: string; // 임대주택 / 주거복지
  subtype: string; // 국민임대, 행복주택, 매입임대 등
  postedAt: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  daysLeft: number | null; // 마감까지 남은 날 (오늘 마감이면 0)
  status: string;
  url: string;
}

export interface HousingSearch {
  notices: HousingNotice[];
  /** 최근 90일 안에 마감된 공고 수 (지금 접수 중인 게 없을 때 '최근엔 있었다'를 말해 주기 위해) */
  closedRecently: number;
}

const dash = (d: string) => d.replace(/\./g, "-");

function koreanDay(plusDays = 0): Date {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + plusDays * 86400 * 1000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** 사는 시도에서 지금 접수 중이거나 곧 열리는 LH 공공임대·주거복지 공고를 마감이 가까운 순으로 보여준다. */
export async function searchHousingNotices(
  sido: Sido,
  sigungu: string,
  limit = 6,
): Promise<ApiResult<HousingSearch>> {
  const source = { ...SOURCE, fetchedAt: new Date().toISOString() };
  const today = koreanDay(0);
  const raw: Record<string, unknown>[] = [];

  // 임대주택(06)과 주거복지(13)를 따로 조회한다. 호출은 한 번에 하나씩 (초당 제한 대비).
  for (const upp of ["06", "13"]) {
    const r = await callDataGoKr(URL_, {
      PG_SZ: "100",
      PAGE: "1",
      CNP_CD: CNP[sido],
      UPP_AIS_TP_CD: upp,
      PAN_ST_DT: ymd(koreanDay(-90)),
      PAN_ED_DT: ymd(today),
    });
    if (!r.ok) return { status: "unavailable", reason: r.reason, source };
    const lists = findValue(r.data, "dsList");
    raw.push(...asArray(lists));
  }

  const all = raw.map((x) => {
    const deadline = dash(str(x.CLSG_DT));
    const dl = deadline.length === 10 ? new Date(`${deadline}T00:00:00Z`) : null;
    return {
      id: str(x.PAN_ID),
      title: str(x.PAN_NM),
      region: str(x.CNP_CD_NM),
      type: str(x.UPP_AIS_TP_NM),
      subtype: str(x.AIS_TP_CD_NM),
      postedAt: dash(str(x.PAN_NT_ST_DT)),
      deadline,
      daysLeft: dl ? Math.round((dl.getTime() - today.getTime()) / 86400000) : null,
      status: str(x.PAN_SS),
      url: str(x.DTL_URL),
    } satisfies HousingNotice;
  });

  const stem = sigungu.replace(/\s/g, "").replace(/(특별자치시|시|군|구)$/, "");
  const sidoFull = SIDO_API_NAME[sido];
  // 지역 코드로 걸러도 '인천광역시 외'처럼 다른 시도가 섞여 오므로, 고른 시도의 공고를 먼저 보여준다.
  const here = (n: HousingNotice) => Number(n.region.startsWith(sidoFull));
  const nearby = (n: HousingNotice) => Number(stem.length >= 2 && n.title.includes(stem));
  const open = all
    .filter((n) => OPEN.has(n.status) && (n.daysLeft === null || n.daysLeft >= 0))
    .filter((n) => !NOT_HOUSING.test(`${n.subtype} ${n.title}`))
    .sort(
      (a, b) =>
        here(b) - here(a) ||
        nearby(b) - nearby(a) ||
        (a.deadline || "9999").localeCompare(b.deadline || "9999"),
    )
    .slice(0, limit);

  const closedRecently = all.filter((n) => n.status === "접수마감").length;
  return { status: "ok", items: { notices: open, closedRecently }, source };
}
