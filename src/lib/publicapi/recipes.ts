import "server-only";
import type { ApiResult } from "./datagokr";

/**
 * 식품의약품안전처 '조리식품의 레시피 DB'(COOKRCP01, 식품안전나라 OpenAPI).
 * - 인증키는 식품안전나라에서 별도 발급(FOODSAFETY_KEY). 없으면 공개 샘플 키("sample")로 동작하며
 *   이 경우 질의당 5건만 돌려준다.
 * - 영양 수치(열량 등)는 DB에 적힌 값이며, 탄수화물·단백질·지방으로 계산한 열량과 크게 어긋나는
 *   항목이 많다(라면 레시피 5건 모두 확인). 그래서 '참고용' 여부를 계산해 함께 돌려준다.
 */
const BASE = "https://openapi.foodsafetykorea.go.kr/api";
const SOURCE = {
  name: "식품의약품안전처 조리식품의 레시피 DB (식품안전나라)",
  url: "https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_grp=MENU_GRP31&menu_no=661&show_cnt=10&start_idx=1&svc_no=COOKRCP01",
};

export interface Recipe {
  id: string;
  name: string;
  category: string; // 반찬, 국&찌개, 일품 등
  method: string; // 끓이기, 볶기 등
  ingredients: string;
  ingredientCount: number;
  steps: string[];
  energy: number | null; // kcal
  carb: number | null; // g
  protein: number | null; // g
  fat: number | null; // g
  sodium: number | null; // mg
  /** 열량이 영양소로 계산한 값과 비슷한지. false면 수치를 확정처럼 말하면 안 된다. */
  nutritionConsistent: boolean;
  /** 나트륨 줄이는 요령 (DB의 저감 조리법 TIP) */
  tip: string;
  image: string;
  /** 레시피 글에서 확인되는 영양 보완 요소와 간단함 */
  tags: string[];
}

export interface RecipeSearch {
  recipes: Recipe[];
  /** 요청한 재료를 모두 포함하는 레시피가 있었는지 */
  matchedAll: boolean;
  /** 공개 샘플 키로 조회해 결과가 제한됐는지 */
  sampleKey: boolean;
}

type Raw = Record<string, string>;

const VEG = ["양파", "대파", "파프리카", "애호박", "당근", "양배추", "배추", "버섯", "시금치", "부추", "청경채", "양상추", "케일", "토마토", "콩나물", "브로콜리", "오이", "무", "상추", "고추"];
const PROTEIN = ["달걀", "계란", "두부", "닭", "돼지", "삼겹", "쇠고기", "소고기", "새우", "조개", "참치", "멸치", "오징어", "북어", "콩", "우유", "치즈"];

const num = (v: unknown): number | null => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const QTY_UNIT = "g|ml|mL|㎖|cc|개|큰술|작은술|컵|스푼|쪽|줄기|장|마리|모|봉|알|조각|꼬집|꼭지|뿌리|포기|단|통";
const PAIR = new RegExp(`[가-힣]+\\s*\\(?\\s*\\d+(?:[./]\\d+)?\\s*(?:${QTY_UNIT})`, "g");

/**
 * '한글 이름 + 수량단위' 한 쌍을 재료 하나로 센다 (달걀 50g(1개)는 하나).
 * 이전의 '괄호 개수' 방식은 괄호 없는 재료 목록(예: 버터 40g, 박력분 90g, ...)에서 크게 틀렸다
 * (전체 1,156건 중 604건이 4개 이상 어긋남).
 */
function countIngredients(text: string): number {
  const n = (text.match(PAIR) ?? []).length;
  return n || text.split(/[,\n]/).filter((t) => t.trim()).length;
}

function toRecipe(r: Raw): Recipe {
  const ingredients = (r.RCP_PARTS_DTLS ?? "").replace(/^재료\s*/, "").replace(/\s+/g, " ").trim();
  const steps = Array.from({ length: 20 }, (_, i) => r[`MANUAL${String(i + 1).padStart(2, "0")}`])
    .map((s) => (s ?? "").replace(/\s*[a-z]$/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const [energy, carb, protein, fat] = [r.INFO_ENG, r.INFO_CAR, r.INFO_PRO, r.INFO_FAT].map(num);
  const ingredientCount = countIngredients(ingredients);

  let nutritionConsistent = false;
  if (energy !== null && carb !== null && protein !== null && fat !== null) {
    const est = 4 * (carb + protein) + 9 * fat;
    nutritionConsistent = est > 0 && Math.abs(energy - est) / est <= 0.35;
  }

  const hay = `${r.RCP_NM} ${ingredients}`;
  const tags: string[] = [];
  if (VEG.some((v) => hay.includes(v))) tags.push("채소 들어감");
  if (PROTEIN.some((v) => hay.includes(v))) tags.push("단백질 재료 들어감");
  if ((r.RCP_NA_TIP ?? "").trim()) tags.push("나트륨 줄이는 팁");
  if (ingredientCount <= 8 && steps.length <= 6) tags.push("간단");

  const img = (r.ATT_FILE_NO_MAIN ?? "").replace(/^http:/, "https:");
  return {
    id: r.RCP_SEQ ?? r.RCP_NM,
    name: r.RCP_NM ?? "",
    category: r.RCP_PAT2 ?? "",
    method: r.RCP_WAY2 ?? "",
    ingredients,
    ingredientCount,
    steps,
    energy, carb, protein, fat,
    sodium: num(r.INFO_NA),
    nutritionConsistent,
    tip: (r.RCP_NA_TIP ?? "").replace(/\s+/g, " ").trim(),
    image: img.startsWith("https://www.foodsafetykorea.go.kr/") ? img : "",
    tags,
  };
}

const TTL = 12 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; rows: Raw[] }>();

async function fetchRows(key: string, range: string, filter = ""): Promise<{ rows: Raw[]; error?: string }> {
  const ck = `${key === "sample" ? "s" : "k"}:${range}:${filter}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return { rows: hit.rows };
  try {
    const url = `${BASE}/${key}/COOKRCP01/json/${range}${filter ? `/${filter}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!res.ok) return { rows: [], error: `레시피 서버 응답 오류 (HTTP ${res.status})` };
    const j = (await res.json()) as { COOKRCP01?: { RESULT?: { CODE?: string; MSG?: string }; row?: Raw[] } };
    const code = j.COOKRCP01?.RESULT?.CODE;
    if (code === "INFO-200") return { rows: [] }; // 해당 데이터 없음
    if (code !== "INFO-000") return { rows: [], error: `레시피 API 오류 (${code ?? "알 수 없음"})` };
    const rows = j.COOKRCP01?.row ?? [];
    cache.set(ck, { at: Date.now(), rows });
    return { rows };
  } catch (e) {
    return { rows: [], error: `레시피 서버 연결 실패 (${(e as Error).name})` };
  }
}

/** 재료로 레시피를 찾는다. goal: simple=적은 재료·짧은 조리, low_sodium=나트륨이 낮은 순 */
export async function searchRecipes(
  ingredients: string[],
  goal: "simple" | "low_sodium" = "simple",
  limit = 3,
): Promise<ApiResult<RecipeSearch>> {
  const source = { ...SOURCE, fetchedAt: new Date().toISOString() };
  const key = process.env.FOODSAFETY_KEY || "sample";
  const sampleKey = key === "sample";

  let rows: Raw[] = [];
  if (sampleKey) {
    // 샘플 키는 질의당 5건만 주므로 첫 재료로 서버에서 걸러 받는다.
    const r = await fetchRows(key, "1/5", `RCP_PARTS_DTLS=${encodeURIComponent(ingredients[0])}`);
    if (r.error) return { status: "unavailable", reason: r.error, source };
    rows = r.rows;
  } else {
    // 전체(약 1,150건)를 받아 한 번만 캐시하고, 서버에서 여러 재료로 걸러 쓴다.
    const [a, b] = await Promise.all([fetchRows(key, "1/1000"), fetchRows(key, "1001/2000")]);
    if (a.error) return { status: "unavailable", reason: a.error, source };
    rows = [...a.rows, ...b.rows];
  }

  const scored = rows
    .map(toRecipe)
    .filter((rc) => rc.name)
    .map((rc) => {
      const hay = `${rc.name} ${rc.ingredients}`;
      const matched = ingredients.filter((w) => hay.includes(w)).length;
      return { rc, matched };
    })
    .filter((x) => x.matched > 0);

  const metric = (rc: Recipe) =>
    goal === "low_sodium" ? (rc.sodium ?? Number.MAX_SAFE_INTEGER) : rc.ingredientCount + rc.steps.length;

  scored.sort(
    (a, b) =>
      b.matched - a.matched ||
      metric(a.rc) - metric(b.rc) ||
      a.rc.ingredientCount + a.rc.steps.length - (b.rc.ingredientCount + b.rc.steps.length),
  );

  let picked = scored.slice(0, limit);
  // 재료를 모두 쓰는 레시피가 복잡하면(간단 태그 없음), 일부 재료만 써도 가장 간단한 레시피를 하나 끼워 넣는다.
  if (picked.length > 0 && !picked.some((x) => x.rc.tags.includes("간단"))) {
    // 사용자가 가장 먼저 말한 재료(주재료)를 쓰는 것만 후보로 삼아 엉뚱한 요리(예: 라면 질문에 스콘)가 끼지 않게 한다.
    const main = ingredients[0];
    const simplest = scored
      .filter((x) => x.rc.tags.includes("간단") && !picked.includes(x) && `${x.rc.name} ${x.rc.ingredients}`.includes(main))
      .sort((a, b) => b.matched - a.matched || a.rc.ingredientCount + a.rc.steps.length - (b.rc.ingredientCount + b.rc.steps.length))[0];
    if (simplest) picked = [...picked.slice(0, limit - 1), simplest];
  }
  const recipes = picked.map((x) => x.rc);
  const matchedAll = scored.length > 0 && scored[0].matched === ingredients.length;
  return { status: "ok", items: { recipes, matchedAll, sampleKey }, source };
}
