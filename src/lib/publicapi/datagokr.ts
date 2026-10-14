import "server-only";
import { XMLParser } from "fast-xml-parser";

/** 공공 API 결과. 실패 시 가짜 데이터 대신 unavailable 과 공식 링크를 돌려준다. */
export type ApiResult<T> =
  | { status: "ok"; items: T; source: Source }
  | { status: "unavailable"; reason: string; source: Source };

export interface Source {
  name: string;
  url: string; // 사람이 확인할 수 있는 공식 페이지
  fetchedAt: string;
}

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

const REASONS: Record<string, string> = {
  SERVICE_KEY_IS_NOT_REGISTERED_ERROR: "이 API의 활용신청 승인이 아직 반영되지 않았어요.",
  NO_OPENAPI_SERVICE_ERROR: "API 주소가 올바르지 않아요.",
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: "오늘 호출 한도를 넘었어요.",
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR: "초당 호출 제한에 걸렸어요.",
};
const PER_SECOND = "초당 호출 제한";

type CallResult = { ok: true; data: unknown } | { ok: false; reason: string };

/**
 * 성공 응답만 메모리에 캐시한다. 복지서비스 API는 기능당 하루 100건이라
 * 같은 검색을 반복 호출하지 않도록 한다. (서버 인스턴스 단위 캐시)
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 400;
const cache = new Map<string, { at: number; data: unknown }>();

/** 같은 호출이 캐시에 있는지 (있으면 API를 부르지 않으므로 호출 간격을 둘 필요가 없다) */
export function isCached(url: string, params: Record<string, string>): boolean {
  const hit = cache.get(url + "?" + new URLSearchParams(params).toString());
  return !!hit && Date.now() - hit.at < CACHE_TTL_MS;
}

export async function callDataGoKr(url: string, params: Record<string, string>): Promise<CallResult> {
  const cacheKey = url + "?" + new URLSearchParams(params).toString();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ok: true, data: hit.data };

  let r = await fetchDataGoKr(url, params);
  // 공공 API는 간헐적으로 느리다. 시간 초과는 한 번만 다시 시도한다.
  if (!r.ok && r.reason.includes("TimeoutError")) r = await fetchDataGoKr(url, params);
  // 초당 호출 제한은 잠깐 기다렸다 다시 시도한다 (최대 4번, 문화정보 API는 초당 1건 안팎). 실패 응답은 캐시하지 않는다.
  for (let i = 0; i < 4 && !r.ok && r.reason.includes(PER_SECOND); i++) {
    await new Promise((res) => setTimeout(res, 1100 * (i + 1)));
    r = await fetchDataGoKr(url, params);
  }
  if (r.ok) {
    // 캐시가 무한히 커지지 않도록 상한을 두고 가장 오래된 것부터 버린다.
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, { at: Date.now(), data: r.data });
  }
  return r;
}

async function fetchDataGoKr(url: string, params: Record<string, string>): Promise<CallResult> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) return { ok: false, reason: "서버에 공공데이터 인증키가 설정되지 않았어요." };

  const u = new URL(url);
  u.searchParams.set("serviceKey", key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);

  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    const text = await res.text();
    const errMsg = text.match(/<errMsg>([^<]+)<\/errMsg>/)?.[1];
    if (errMsg) return { ok: false, reason: REASONS[errMsg] ?? `API 오류 (${errMsg})` };
    if (!res.ok) return { ok: false, reason: `API 응답 오류 (HTTP ${res.status})` };
    // LH 공고 API는 '[' 로 시작하는 JSON 배열을 준다. '{' 만 JSON으로 보면 XML 파서로 넘어가 깨진다.
    const head = text.trimStart()[0];
    if (!head) return { ok: false, reason: "API가 빈 응답을 보냈어요." };
    const data = head === "{" || head === "[" ? JSON.parse(text) : parser.parse(text);
    const code = findValue(data, "resultCode");
    if (code && !["00", "000", "0000", "0"].includes(String(code))) {
      return { ok: false, reason: `API 결과 코드 ${code}: ${findValue(data, "resultMsg") ?? ""}` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, reason: `API 연결 실패 (${(e as Error).name})` };
  }
}

/** 중첩 객체에서 key 를 가진 첫 값을 찾는다 (응답 구조가 문서와 조금 달라도 동작하도록). */
export function findValue(obj: unknown, key: string): unknown {
  if (obj === null || typeof obj !== "object") return undefined;
  if (key in (obj as Record<string, unknown>)) return (obj as Record<string, unknown>)[key];
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const found = findValue(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** 단건이면 객체, 여러 건이면 배열로 오는 XML 특성을 배열로 통일 */
export function asArray<T = Record<string, unknown>>(v: unknown): T[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : [v]) as T[];
}

export function toNumber(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function str(v: unknown): string {
  return v === undefined || v === null ? "" : String(v).trim();
}
