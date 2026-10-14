import "server-only";
import { asArray, callDataGoKr, findValue, str, toNumber, type ApiResult } from "./datagokr";

const ENDPOINTS = [
  { type: "아파트", url: "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent" },
  { type: "연립다세대", url: "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent" },
  { type: "오피스텔", url: "https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent" },
] as const;

export interface RentStats {
  lawd: string;
  months: string[]; // 조회한 계약년월
  monthly: { count: number; medianDeposit: number; medianRent: number }; // 만원
  jeonse: { count: number; medianDeposit: number }; // 만원
  /** 1인 가구가 주로 구하는 전용 40㎡ 이하 월세 (만원) */
  small: { count: number; medianDeposit: number; medianRent: number };
  byType: { type: string; count: number }[];
  sampleDongs: string[]; // 지역코드 검증용
}

const SMALL_AREA = 40; // ㎡

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** 최근 n개월(이번 달은 신고 지연으로 제외) */
function recentMonths(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export async function getRentStats(lawd: string): Promise<ApiResult<RentStats>> {
  const months = recentMonths(3);
  const source = {
    name: "국토교통부 전월세 실거래가 (공공데이터포털)",
    url: "https://rt.molit.go.kr",
    fetchedAt: new Date().toISOString(),
  };

  const calls = ENDPOINTS.flatMap((e) =>
    months.map(async (ym) => ({
      type: e.type,
      r: await callDataGoKr(e.url, { LAWD_CD: lawd, DEAL_YMD: ym, pageNo: "1", numOfRows: "1000" }),
    })),
  );
  const results = await Promise.all(calls);
  const okResults = results.filter((x) => x.r.ok);
  if (okResults.length === 0) {
    const first = results[0]?.r;
    return { status: "unavailable", reason: first && !first.ok ? first.reason : "데이터 없음", source };
  }

  const monthlyDeposits: number[] = [];
  const monthlyRents: number[] = [];
  const jeonseDeposits: number[] = [];
  const smallDeposits: number[] = [];
  const smallRents: number[] = [];
  const typeCount = new Map<string, number>();
  const dongs = new Set<string>();

  for (const { type, r } of okResults) {
    if (!r.ok) continue;
    for (const it of asArray(findValue(r.data, "item"))) {
      const deposit = toNumber(it.deposit ?? it["보증금액"]);
      const rent = toNumber(it.monthlyRent ?? it["월세금액"]);
      const dong = str(it.umdNm ?? it["법정동"]);
      if (dong) dongs.add(dong);
      typeCount.set(type, (typeCount.get(type) ?? 0) + 1);
      const area = toNumber(it.excluUseAr ?? it["전용면적"]);
      if (rent > 0) {
        monthlyDeposits.push(deposit);
        monthlyRents.push(rent);
        if (area > 0 && area <= SMALL_AREA) {
          smallDeposits.push(deposit);
          smallRents.push(rent);
        }
      } else if (deposit > 0) {
        jeonseDeposits.push(deposit);
      }
    }
  }

  return {
    status: "ok",
    source,
    items: {
      lawd,
      months,
      monthly: { count: monthlyRents.length, medianDeposit: median(monthlyDeposits), medianRent: median(monthlyRents) },
      jeonse: { count: jeonseDeposits.length, medianDeposit: median(jeonseDeposits) },
      small: { count: smallRents.length, medianDeposit: median(smallDeposits), medianRent: median(smallRents) },
      byType: [...typeCount].map(([type, count]) => ({ type, count })),
      sampleDongs: [...dongs].slice(0, 5),
    },
  };
}
