import "server-only";
import type { Sido } from "@/lib/centers";
import { asArray, callDataGoKr, findValue, isCached, str, type ApiResult } from "./datagokr";

/**
 * 한국문화정보원 '한눈에보는문화정보조회서비스' (공연·전시·행사).
 * - area2: 지역별 목록 (제목·기간·장소·시군구). 가격은 목록에 없다.
 * - detail2: 상세 (가격, 링크, 전화, 주소). 후보마다 호출해 가격을 확인한다.
 * 구·군 필터 파라미터 이름은 sigungu (gugun, gugunNm 은 적용되지 않음 — 2026-10-09 확인).
 */
const BASE = "https://apis.data.go.kr/B553457/cultureinfo";
const SOURCE = { name: "한국문화정보원 한눈에보는문화정보 (문화포털)", url: "https://www.culture.go.kr" };

export interface CultureEvent {
  id: string;
  title: string;
  start: string; // YYYY-MM-DD
  end: string;
  place: string;
  address: string;
  realm: string; // 전시, 음악/콘서트, 행사/축제 등
  price: string; // DB에 적힌 그대로 ("무료", "전석 10,000원" 등, 비어 있을 수 있음)
  /** 상세 조회에 성공해 가격을 확인했는지. false면 '무료가 아님'이 아니라 '모름'이다. */
  priceKnown: boolean;
  free: boolean;
  url: string;
  phone: string;
  image: string;
}

export interface CultureSearch {
  events: CultureEvent[];
  /** 후보 중 상세를 조회한 수 */
  checked: number;
  /** 상세 조회에 실패해 가격을 확인하지 못한 수 (무료만 요청하면 이 행사들은 빠진다) */
  unchecked: number;
  freeOnly: boolean;
}

/** XML 응답에 HTML 엔티티가 두 번 인코딩돼 있어(&amp;lt;) 두 번 풀어 준다. */
function decode(s: string): string {
  const named: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°", middot: "·", hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };
  const once = (t: string) =>
    t
      .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
      .replace(/&([a-z]+);/gi, (m, name: string) => named[name.toLowerCase()] ?? m)
      .replace(/&amp;/g, "&");
  return once(once(s)).replace(/\s+/g, " ").trim();
}

const ymd = (s: string) => (s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s);
const https = (u: string) => (u.startsWith("http://www.culture.go.kr/") ? u.replace("http:", "https:") : u);

/**
 * 상세 조회를 1건씩, 호출 사이에 간격을 두고 실행한다.
 * 이 API는 초당 호출 제한이 매우 빡빡하다 (2026-10-09 측정: 0.25초 간격 순차 호출 20건 전부 실패,
 * 0.5초 간격 20건 중 9건 실패). 이미 캐시에 있는 건은 간격 없이 바로 쓴다.
 */
const DETAIL_GAP_MS = 1100;
async function fetchDetails<T>(items: T[], fetchOne: (x: T) => Promise<{ cached: boolean }>): Promise<void> {
  for (const it of items) {
    const { cached } = await fetchOne(it);
    if (!cached) await new Promise((r) => setTimeout(r, DETAIL_GAP_MS));
  }
}

/** 한국 시간 기준 오늘부터 며칠 뒤까지의 YYYYMMDD */
function koreanDate(plusDays = 0): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + plusDays * 86400 * 1000);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function list(sido: Sido, sigungu: string, rows: number) {
  const params: Record<string, string> = {
    PageNo: "1",
    numOfrows: String(rows),
    sortStdr: "1",
    from: koreanDate(0),
    to: koreanDate(30),
    // 문화 API는 광주·전남 통합 후 전남 행사(순천·여수·광양 등)를 '광주' 아래에 넣는다 (전남은 0건, 2026-10-09 확인)
    sido: sido === "전남" ? "광주" : sido,
  };
  if (sigungu) params.sigungu = sigungu;
  return callDataGoKr(`${BASE}/area2`, params);
}

/** 사는 지역에서 앞으로 30일 안에 열리는 공연·전시·행사를 찾는다. freeOnly면 가격이 '무료'인 것만. */
export async function searchCultureEvents(
  sido: Sido,
  sigungu: string,
  freeOnly: boolean,
  limit = 5,
): Promise<ApiResult<CultureSearch>> {
  const source = { ...SOURCE, fetchedAt: new Date().toISOString() };

  let r = await list(sido, sigungu, 40);
  if (!r.ok) return { status: "unavailable", reason: r.reason, source };
  let items = asArray(findValue(r.data, "item"));

  // 시군구 이름이 정확히 안 맞으면(예: '수원시' vs '수원시 팔달구') 시도 전체에서 이름으로 거른다.
  if (items.length === 0 && sigungu) {
    r = await list(sido, "", 100);
    if (!r.ok) return { status: "unavailable", reason: r.reason, source };
    const sg = sigungu.replace(/\s/g, "");
    items = asArray(findValue(r.data, "item")).filter((it) => {
      const s = str(it.sigungu).replace(/\s/g, "");
      return s && (s.includes(sg) || sg.includes(s));
    });
  }

  const today = koreanDate(0);
  const seen = new Set<string>();
  const candidates = items
    .filter((it) => str(it.endDate) >= today)
    .filter((it) => !seen.has(str(it.seq)) && seen.add(str(it.seq)))
    // 상세 조회는 호출 제한 때문에 천천히 해야 하므로 후보를 적게 잡는다 (무료만 찾을 때는 더 많이)
    .slice(0, freeOnly ? 8 : limit);

  const detailed: { it: (typeof candidates)[number]; det: Record<string, unknown> | undefined }[] = [];
  await fetchDetails(candidates, async (it) => {
    const params = { seq: str(it.seq) };
    const cached = isCached(`${BASE}/detail2`, params);
    const d = await callDataGoKr(`${BASE}/detail2`, params);
    detailed.push({ it, det: d.ok ? asArray(findValue(d.data, "item"))[0] : undefined });
    return { cached };
  });

  const events: CultureEvent[] = detailed.map(({ it, det }) => {
    const price = decode(str(det?.price));
    return {
      id: str(it.seq),
      title: decode(str(it.title)),
      start: ymd(str(it.startDate)),
      end: ymd(str(it.endDate)),
      place: decode(str(it.place)),
      address: decode(str(det?.placeAddr)),
      realm: str(it.realmName),
      price,
      priceKnown: det !== undefined,
      free: /무료/.test(price),
      url: decode(str(det?.url)),
      phone: decode(str(det?.phone)),
      image: https(str(det?.imgUrl) || str(it.thumbnail)),
    };
  });

  const shown = (freeOnly ? events.filter((e) => e.free) : events).slice(0, limit);
  const unchecked = events.filter((e) => !e.priceKnown).length;
  return { status: "ok", items: { events: shown, checked: events.length, unchecked, freeOnly }, source };
}
