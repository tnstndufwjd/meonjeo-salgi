import type { CenterResult } from "@/lib/centers";
import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { CultureSearch } from "@/lib/publicapi/culture";
import type { HousingSearch } from "@/lib/publicapi/housing";
import type { YouthSearch } from "@/lib/publicapi/youth";
import type { RecipeSearch } from "@/lib/publicapi/recipes";
import type { LocalWelfareItem } from "@/lib/publicapi/localWelfare";
import type { RentStats } from "@/lib/publicapi/rent";
import type { WelfareItem } from "@/lib/publicapi/welfare";
import type { ScenarioResult } from "@/lib/scenario";

/** 도구 결과를 화면 카드로 그대로 보여준다 (AI 요약과 별개로 원 데이터를 노출). */
export type Card =
  | { kind: "welfare"; keyword: string; result: ApiResult<WelfareItem[]> }
  | { kind: "localWelfare"; region: string; keyword: string; result: ApiResult<LocalWelfareItem[]> }
  | { kind: "centers"; result: CenterResult }
  | { kind: "culture"; area: string; result: ApiResult<CultureSearch> }
  | { kind: "housing"; area: string; result: ApiResult<HousingSearch> }
  | { kind: "youth"; area: string; topic: string; result: ApiResult<YouthSearch> }
  | { kind: "recipes"; ingredients: string[]; result: ApiResult<RecipeSearch> }
  | { kind: "rent"; region: string; result: ApiResult<RentStats> }
  | { kind: "scenario"; results: ScenarioResult[] }
  | { kind: "links"; links: { title: string; desc: string; href: string }[] };

/** /api/chat 이 한 줄씩 보내는 이벤트 (NDJSON) */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; label: string }
  | { type: "card"; card: Card }
  | { type: "crisis" }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}
