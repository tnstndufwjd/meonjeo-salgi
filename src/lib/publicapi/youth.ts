import "server-only";
import type { Sido } from "@/lib/centers";
import type { ApiResult, Source } from "./datagokr";

/**
 * 온통청년 청년정책 API (www.youthcenter.go.kr/go/ythip/getPlcy). data.go.kr 키가 아니라
 * 온통청년 사이트에서 발급받은 인증키(YOUTH_API_KEY)를 쓴다.
 *
 * 2026-10-13 확인한 사실:
 * - 전체 3,234건. 한 번에 500건까지, 7쪽을 순서대로 받으면 빠짐없이 받아진다(약 8~12초). 이후 6시간 캐시.
 *   분류(lclsfNm)로 나눠 받으면 합계가 2,525건이라 709건이 빠진다.
 * - aplyPrdSeCd: 0057001=특정 기간(aplyYmd "시작 ~ 끝"), 0057002=상시, 0057003=신청 시기 미표기(사업기간은 진행 중인 것이 많음).
 *   특정 기간 430건 중 319건이, 상시 461건 중 300건(사업기간 종료일이 지남)이 이미 끝난 정책이라 걸러야 한다.
 * - zipCd: 정책이 적용되는 시군구 5자리 코드 목록. 전국 정책은 230여 개, 시도 단위는 20여 개, 지역 한정은 1~8개.
 *   시도 코드 접두: 서울11 부산26 대구27 인천28 대전30 울산31 세종36 경기41 충북43 충남44 경북47 경남48 제주50 강원51 전북52.
 *   광주·전남은 통합되어 접두 12를 쓴다(기관명 '전남광주통합특별시' 463건).
 * - 연령(sprtTrgtMinAge/MaxAge)은 sprtTrgtAgeLmtYn이 'Y'일 때만 의미가 있다.
 * - earnCndSeCd: 0043001=소득 무관, 0043002=연소득 기준, 0043003=기타(earnEtcCn에 글로 적힘).
 */
const URL_ = "https://www.youthcenter.go.kr/go/ythip/getPlcy";
const SOURCE = { name: "온통청년 청년정책 (한국고용정보원)", url: "https://www.youthcenter.go.kr" };

export const YOUTH_TOPICS = ["전체", "주거", "일자리", "교육직업훈련", "금융복지문화", "참여기반", "자립준비청년"] as const;
export type YouthTopic = (typeof YOUTH_TOPICS)[number];

const SIDO_PREFIX: Record<Sido, string[]> = {
  서울: ["11"], 부산: ["26"], 대구: ["27"], 인천: ["28"], 광주: ["12"], 대전: ["30"], 울산: ["31"], 세종: ["36"],
  경기: ["41"], 강원: ["51"], 충북: ["43"], 충남: ["44"], 전북: ["52"], 전남: ["12"], 경북: ["47"], 경남: ["48"], 제주: ["50"],
};

interface Row {
  plcyNo: string;
  plcyNm: string;
  plcyKywdNm: string;
  plcyExplnCn: string;
  lclsfNm: string;
  mclsfNm: string;
  plcySprtCn: string;
  sprvsnInstCdNm: string;
  aplyPrdSeCd: string;
  aplyYmd: string;
  bizPrdEndYmd: string;
  plcyAplyMthdCn: string;
  aplyUrlAddr: string;
  refUrlAddr1: string;
  refUrlAddr2: string;
  sprtTrgtMinAge: string;
  sprtTrgtMaxAge: string;
  sprtTrgtAgeLmtYn: string;
  earnCndSeCd: string;
  earnEtcCn: string;
  addAplyQlfcCndCn: string;
  ptcpPrpTrgtCn: string;
  zipCd: string;
}

export interface YouthPolicy {
  id: string;
  name: string;
  category: string;
  institution: string;
  /** 신청 시기: 상시 / 기간(마감일 있음) / 시기 미표기 */
  timing: "always" | "period" | "unknown";
  period: string; // 화면용 문구
  daysLeft: number | null; // 기간형일 때 마감까지 남은 날
  upcoming: boolean; // 아직 시작 전
  ageText: string;
  incomeText: string;
  support: string;
  how: string;
  url: string;
  /** 어느 범위의 정책인지 */
  scope: "local" | "sido" | "national";
  forFosterYouth: boolean; // 본문에 자립준비·보호종료 언급
}

export interface YouthSearch {
  policies: YouthPolicy[];
  /** 조건에 맞는 전체 수 (보여주는 것은 일부) */
  matched: number;
  topic: YouthTopic;
}

const clip = (s: string, n: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

const FOSTER = /자립준비|보호종료|보호대상아동|아동복지시설|자립지원/;

/* ---------- 전체 데이터 적재 (6시간 캐시, 동시 호출은 하나로 합침) ---------- */
const TTL = 6 * 60 * 60 * 1000;
let store: { at: number; rows: Row[] } | null = null;
let loading: Promise<Row[] | { error: string }> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(key: string, pageNum: number): Promise<{ rows: Row[]; total: number } | { error: string }> {
  const u = new URL(URL_);
  u.searchParams.set("apiKeyNm", key);
  u.searchParams.set("pageNum", String(pageNum));
  u.searchParams.set("pageSize", "500");
  u.searchParams.set("rtnType", "json");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
      const j = (await res.json()) as { resultCode?: number; resultMessage?: string; result?: { youthPolicyList?: Row[]; pagging?: { totCount?: number } } };
      if (j.resultCode === 200 && j.result?.youthPolicyList) {
        return { rows: j.result.youthPolicyList, total: j.result.pagging?.totCount ?? 0 };
      }
      // 인증 오류는 재시도해도 소용없다
      if (j.resultCode === 401 || j.resultCode === 403) return { error: "온통청년 인증키 오류예요." };
    } catch {
      /* 다시 시도 */
    }
    await sleep(800 * (attempt + 1));
  }
  return { error: "온통청년 서버에서 데이터를 받지 못했어요." };
}

async function loadAll(): Promise<Row[] | { error: string }> {
  const key = process.env.YOUTH_API_KEY;
  if (!key) return { error: "온통청년 인증키가 서버에 설정되지 않았어요." };
  if (store && Date.now() - store.at < TTL) return store.rows;
  if (loading) return loading;

  loading = (async () => {
    const all: Row[] = [];
    let total = Infinity;
    for (let pg = 1; all.length < total && pg <= 12; pg++) {
      const r = await fetchPage(key, pg);
      if ("error" in r) return r;
      total = r.total;
      // 필요한 항목만 줄여서 보관한다 (메모리 절약)
      all.push(
        ...r.rows.map((p) => ({
          plcyNo: p.plcyNo, plcyNm: p.plcyNm, plcyKywdNm: p.plcyKywdNm,
          plcyExplnCn: clip(p.plcyExplnCn, 260), lclsfNm: p.lclsfNm, mclsfNm: p.mclsfNm,
          plcySprtCn: clip(p.plcySprtCn, 320), sprvsnInstCdNm: p.sprvsnInstCdNm,
          aplyPrdSeCd: p.aplyPrdSeCd, aplyYmd: p.aplyYmd, bizPrdEndYmd: p.bizPrdEndYmd,
          plcyAplyMthdCn: clip(p.plcyAplyMthdCn, 200), aplyUrlAddr: p.aplyUrlAddr,
          refUrlAddr1: p.refUrlAddr1, refUrlAddr2: p.refUrlAddr2,
          sprtTrgtMinAge: p.sprtTrgtMinAge, sprtTrgtMaxAge: p.sprtTrgtMaxAge, sprtTrgtAgeLmtYn: p.sprtTrgtAgeLmtYn,
          earnCndSeCd: p.earnCndSeCd, earnEtcCn: clip(p.earnEtcCn, 120),
          addAplyQlfcCndCn: clip(p.addAplyQlfcCndCn, 200), ptcpPrpTrgtCn: clip(p.ptcpPrpTrgtCn, 160), zipCd: p.zipCd,
        })),
      );
      await sleep(400);
    }
    store = { at: Date.now(), rows: all };
    return all;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

/* ---------- 변환·거르기 ---------- */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}
const dayDiff = (a: string, b: string) =>
  Math.round((Date.UTC(+a.slice(0, 4), +a.slice(4, 6) - 1, +a.slice(6, 8)) - Date.UTC(+b.slice(0, 4), +b.slice(4, 6) - 1, +b.slice(6, 8))) / 86400000);
const fmt = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

/** 신청 시기를 해석한다. 이미 끝난 정책은 null. */
function timing(p: Row, today: string) {
  const bizEnd = (p.bizPrdEndYmd ?? "").trim();
  const bizOver = /^\d{8}$/.test(bizEnd) && bizEnd < today;
  if (p.aplyPrdSeCd === "0057001") {
    const [s, e] = (p.aplyYmd ?? "").split("~").map((x) => x.trim());
    if (!/^\d{8}$/.test(e ?? "") || e < today) return null;
    return {
      timing: "period" as const,
      period: `${fmt(s)} ~ ${fmt(e)}`,
      daysLeft: dayDiff(e, today),
      upcoming: /^\d{8}$/.test(s) && s > today,
    };
  }
  if (bizOver) return null;
  if (p.aplyPrdSeCd === "0057002") return { timing: "always" as const, period: "상시", daysLeft: null, upcoming: false };
  return { timing: "unknown" as const, period: "신청 시기는 공고에서 확인", daysLeft: null, upcoming: false };
}

function ageOk(p: Row, age: number): boolean {
  if (!age || p.sprtTrgtAgeLmtYn !== "Y") return true;
  const min = Number(p.sprtTrgtMinAge) || 0;
  const max = Number(p.sprtTrgtMaxAge) || 0;
  return !(min && age < min) && !(max && age > max);
}

function ageText(p: Row): string {
  if (p.sprtTrgtAgeLmtYn !== "Y") return "연령 제한 없음";
  const min = Number(p.sprtTrgtMinAge) || 0;
  const max = Number(p.sprtTrgtMaxAge) || 0;
  if (min && max) return `만 ${min}~${max}세`;
  if (min) return `만 ${min}세 이상`;
  if (max) return `만 ${max}세 이하`;
  return "연령 조건은 원문 확인";
}

function incomeText(p: Row): string {
  if (p.earnCndSeCd === "0043001") return "소득 조건 없음";
  if (p.earnCndSeCd === "0043002") return "소득 기준이 있어요 (원문 확인)";
  return p.earnEtcCn ? `소득·자격: ${p.earnEtcCn}` : "소득 조건은 원문 확인";
}

const TOPIC_MATCH: Record<YouthTopic, (p: Row) => boolean> = {
  전체: () => true,
  주거: (p) => p.lclsfNm.includes("주거"),
  일자리: (p) => p.lclsfNm.includes("일자리"),
  교육직업훈련: (p) => p.lclsfNm.includes("교육"),
  금융복지문화: (p) => p.lclsfNm.includes("금융") || p.lclsfNm.includes("복지"),
  참여기반: (p) => p.lclsfNm.includes("참여"),
  자립준비청년: (p) => FOSTER.test(`${p.plcyNm} ${p.plcyExplnCn} ${p.ptcpPrpTrgtCn} ${p.addAplyQlfcCndCn}`),
};

/**
 * 사는 지역에서 지금 신청할 수 있는 청년정책을 찾는다.
 * 지역 한정 정책을 먼저, 그다음 시도 단위, 전국 정책 순으로 보여준다. 신청 자격은 판정하지 않는다.
 * lawds: 사는 곳으로 좁혀지는 시군구 5자리 코드들(성남시처럼 구가 여럿이면 여러 개). 모르면 비워 둔다.
 */
export async function searchYouthPolicies(opts: {
  sido: Sido;
  sigungu: string;
  topic: YouthTopic;
  keyword: string;
  age: number;
  lawds?: string[];
  limit?: number;
}): Promise<ApiResult<YouthSearch>> {
  const source: Source = { ...SOURCE, fetchedAt: new Date().toISOString() };
  const loaded = await loadAll();
  if ("error" in loaded) return { status: "unavailable", reason: loaded.error, source };

  const today = todayKst();
  const prefixes = SIDO_PREFIX[opts.sido];
  const stem = opts.sigungu.replace(/\s/g, "").replace(/(특별자치시|시|군|구)$/, "");
  const kw = opts.keyword.trim();
  const lawds = opts.lawds ?? [];
  const topicMatch = TOPIC_MATCH[opts.topic];

  const scored: { p: YouthPolicy; rank: number; deadline: number }[] = [];
  for (const r of loaded) {
    if (!topicMatch(r)) continue;
    const zips = (r.zipCd ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const inSido = zips.some((c) => prefixes.some((pf) => c.startsWith(pf)));
    const byName = stem.length >= 2 && (r.sprvsnInstCdNm ?? "").replace(/\s/g, "").includes(stem);
    const exact = lawds.length > 0 && zips.some((c) => lawds.includes(c));
    if (!inSido && !byName) continue;
    // 한두 곳만 대상인 정책(코드 8개 이하)은 '내 지역'이 확인될 때만 보여준다.
    // (이전에는 코드를 모르면 같은 시도의 다른 시 정책이 '우리 지역'으로 섞였다: 성남시 질문에 여주·평택 정책)
    if (zips.length <= 8 && !exact && !byName) continue;
    // 시도·광역 단위 정책은, 내 시군구 코드를 알면 그 코드가 목록에 있을 때만 보여준다.
    if (zips.length > 8 && zips.length <= 60 && lawds.length > 0 && !exact && !byName) continue;
    if (!ageOk(r, opts.age)) continue;
    if (kw && !`${r.plcyNm} ${r.plcyKywdNm} ${r.plcyExplnCn} ${r.mclsfNm}`.includes(kw)) continue;
    const t = timing(r, today);
    if (!t) continue;

    // 범위: 코드 8개 이하=지역 한정, 60개 이하=시도·광역 단위, 그 이상=전국
    const scope: YouthPolicy["scope"] = zips.length > 60 ? "national" : zips.length <= 8 ? "local" : "sido";
    const fosterMention = FOSTER.test(`${r.plcyNm} ${r.plcyExplnCn} ${r.ptcpPrpTrgtCn} ${r.addAplyQlfcCndCn}`);
    const rank = (fosterMention ? 10 : 0) + (scope === "local" ? 6 : scope === "sido" ? 4 : 2) + (byName ? 2 : 0) + (kw ? 1 : 0);

    scored.push({
      rank,
      deadline: t.timing === "period" && t.daysLeft !== null ? t.daysLeft : 9999,
      p: {
        id: r.plcyNo,
        name: r.plcyNm,
        category: [r.lclsfNm.split(",")[0], r.mclsfNm].filter(Boolean).join(" > "),
        institution: r.sprvsnInstCdNm,
        timing: t.timing,
        period: t.period,
        daysLeft: t.daysLeft,
        upcoming: t.upcoming,
        ageText: ageText(r),
        incomeText: incomeText(r),
        support: r.plcySprtCn || r.plcyExplnCn,
        how: r.plcyAplyMthdCn,
        url: r.aplyUrlAddr || r.refUrlAddr1 || r.refUrlAddr2 || "",
        scope,
        forFosterYouth: fosterMention,
      },
    });
  }

  scored.sort((a, b) => b.rank - a.rank || a.deadline - b.deadline);
  return {
    status: "ok",
    items: { policies: scored.slice(0, opts.limit ?? 6).map((x) => x.p), matched: scored.length, topic: opts.topic },
    source,
  };
}
