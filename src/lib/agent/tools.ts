import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { findCenters, shortSido, SIDO_LIST } from "@/lib/centers";
import { searchCultureEvents } from "@/lib/publicapi/culture";
import { searchHousingNotices } from "@/lib/publicapi/housing";
import { searchYouthPolicies, YOUTH_TOPICS } from "@/lib/publicapi/youth";
import { searchLocalWelfareByArea } from "@/lib/publicapi/localWelfare";
import { searchRecipes } from "@/lib/publicapi/recipes";
import { getRentStats } from "@/lib/publicapi/rent";
import { searchWelfare } from "@/lib/publicapi/welfare";
import { REGIONS } from "@/lib/regions";
import { SIDO_API_NAME } from "@/lib/sido";
import { calcScenarios } from "@/lib/scenario";
import type { Card } from "./cards";
import { LINK_TOPICS, OFFICIAL_LINKS } from "./links";

import { LOCAL_KEYWORDS, WELFARE_KEYWORDS } from "@/lib/keywords";
const REGION_NAMES = REGIONS.map((r) => r.name) as [string, ...string[]];

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_welfare",
    description:
      "중앙부처 복지서비스(복지로)를 키워드로 검색한다. 생활비·주거·일자리·마음 건강 등 도움이 필요해 보이면 사용자가 묻지 않아도 먼저 호출한다. 결과에 있는 제도만 안내할 수 있다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        keyword: { type: "string", enum: [...WELFARE_KEYWORDS], description: "검색 키워드" },
      },
      required: ["keyword"],
      additionalProperties: false,
    },
  },
  {
    name: "search_local_welfare",
    description:
      "사용자가 사는 시·도·시군구에서 자체 운영하는 복지서비스를 검색한다(지역 청년 월세 지원, 청년통장, 생필품·식품 나눔, 지역 문화 지원 등). 전국 어느 지역이든 가능하다. 지역을 알면 search_welfare와 함께 호출한다. 키워드: 청년·자립·주거·월세·취업은 기본, 생필품(라면 같은 생활용품·식품 지원)·식품·문화는 해당 이야기가 나올 때. 시군구를 모르면 빈 문자열.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        sido: { type: "string", enum: [...SIDO_LIST], description: "시도 짧은 이름 (예: 서울, 경기, 대전)" },
        sigungu: { type: "string", description: "시군구 이름 (예: 성남시, 관악구). 모르면 빈 문자열" },
        keyword: { type: "string", enum: [...LOCAL_KEYWORDS], description: "검색 키워드" },
      },
      required: ["sido", "sigungu", "keyword"],
      additionalProperties: false,
    },
  },
  {
    name: "search_youth_policies",
    description:
      "온통청년의 청년정책 약 3,200건에서, 사는 지역에서 지금 신청할 수 있는 정책(주거·일자리·교육·금융·복지·문화·참여)을 찾는다. 이미 마감된 정책은 빠진다. 자립준비청년 대상 지원(자립수당, 자립지원전담기관 등)은 topic을 '자립준비청년'으로 한다. 사용자가 나이를 말했으면 age에 넣고 모르면 0. 신청 자격(소득·연령·거주 요건)은 정책마다 달라 판정하지 않는다. 지역(시도)을 모르면 먼저 물어본다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        sido: { type: "string", enum: [...SIDO_LIST], description: "시도 짧은 이름 (예: 서울, 경기, 대전)" },
        sigungu: { type: "string", description: "시군구 이름 (예: 성남시 분당구, 관악구). 모르면 빈 문자열" },
        topic: { type: "string", enum: [...YOUTH_TOPICS], description: "분야. 전체=모든 분야, 자립준비청년=자립준비·보호종료 청년 대상" },
        keyword: { type: "string", description: "정책 이름·설명에서 찾을 낱말 1개 (예: 월세, 창업, 자격증). 없으면 빈 문자열" },
        age: { type: "integer", description: "사용자의 만 나이. 모르면 0" },
      },
      required: ["sido", "sigungu", "topic", "keyword", "age"],
      additionalProperties: false,
    },
  },
  {
    name: "search_housing_notices",
    description:
      "사는 지역에서 지금 접수 중이거나 곧 마감하는 LH 공공임대·주거복지(매입임대·집주인임대) 공고를 마감이 가까운 순으로 찾는다. 집 구하기, 임대주택, 월세가 부담될 때 사용한다. 신청 자격(소득·자산·연령)은 공고문에 있어 판정할 수 없다. 지역(시도)을 모르면 먼저 물어본다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        sido: { type: "string", enum: [...SIDO_LIST], description: "시도 짧은 이름 (예: 서울, 경기, 대전)" },
        sigungu: { type: "string", description: "시군구 이름 (예: 성남시, 관악구). 모르면 빈 문자열" },
      },
      required: ["sido", "sigungu"],
      additionalProperties: false,
    },
  },
  {
    name: "search_culture_events",
    description:
      "사는 지역에서 앞으로 30일 안에 열리는 공연·전시·문화행사를 문화포털 데이터에서 찾는다. 문화생활, 여가, 주말에 갈 곳, '무료로 즐길 수 있는 것' 이야기가 나오면 사용한다. free_only가 true면 가격이 '무료'로 적힌 행사만 보여준다. 지역(시도)을 모르면 먼저 물어본다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        sido: { type: "string", enum: [...SIDO_LIST], description: "시도 짧은 이름 (예: 서울, 경기, 대전)" },
        sigungu: { type: "string", description: "시군구 이름 (예: 성남시, 관악구). 모르면 빈 문자열" },
        free_only: { type: "boolean", description: "무료 행사만 찾을지" },
      },
      required: ["sido", "sigungu", "free_only"],
      additionalProperties: false,
    },
  },
  {
    name: "search_recipes",
    description:
      "식약처 레시피 DB에서 집에 있는 재료로 만들 수 있는 간단한 레시피를 찾는다. 요리·끼니·'냉장고에 뭐뿐인데' 같은 말이 나오면 사용한다. 라면 기반 레시피도 찾을 수 있고, 나트륨이 낮은 순으로 찾을 수도 있다. 영양 수치는 DB에 적힌 값이라 확정처럼 말하지 말고 결과의 nutritionConsistent와 tags를 보고 안내한다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "사용자가 가진 재료 1~4개 (한글 낱말, 예: 라면, 달걀, 양파)",
        },
        goal: {
          type: "string",
          enum: ["simple", "low_sodium"],
          description: "simple=간단한 순, low_sodium=나트륨 낮은 순(라면을 건강하게 먹고 싶을 때)",
        },
      },
      required: ["ingredients", "goal"],
      additionalProperties: false,
    },
  },
  {
    name: "find_employment_center",
    description:
      "사용자가 사는 지역의 고용센터(고용복지+센터)를 찾아 주소·전화·지도 링크를 카드로 보여준다. 구직 신청, 국민취업지원제도, 직업훈련 상담처럼 고용센터 방문이나 전화가 필요한 일자리 안내를 할 때 사용한다. 지역을 모르면 먼저 물어본다. 시군구를 모르면 빈 문자열을 넣는다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        sido: { type: "string", enum: [...SIDO_LIST], description: "시도 짧은 이름 (예: 서울, 대전, 경기)" },
        sigungu: { type: "string", description: "시군구 이름 (예: 서구, 수원시, 관악구). 모르면 빈 문자열" },
      },
      required: ["sido", "sigungu"],
      additionalProperties: false,
    },
  },
  {
    name: "get_rent_stats",
    description:
      "지역의 최근 3개월 전월세 실거래가 중간값을 조회한다. 월세가 적정한지, 이사·계약을 고민할 때 사용한다. 집의 안전성을 판정하는 도구가 아니다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        region: { type: "string", enum: REGION_NAMES, description: "지원 지역 이름" },
      },
      required: ["region"],
      additionalProperties: false,
    },
  },
  {
    name: "calc_scenarios",
    description:
      "월 수입·지출·저축으로 3개월 시나리오(지금 유지 / 훈련 후 취업 / 주거비 낮추기)의 잔액을 계산한다. 금액은 만원 단위. 사용자가 말한 숫자만 넣고, 모르는 값은 먼저 물어본다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        monthly_income: { type: "number", description: "월 수입(만원)" },
        rent: { type: "number", description: "월세+관리비(만원)" },
        other_fixed: { type: "number", description: "통신·교통·공과금(만원)" },
        living: { type: "number", description: "식비 등 생활비(만원)" },
        savings: { type: "number", description: "모아둔 돈(만원)" },
        debt: { type: "number", description: "빚(만원)" },
      },
      required: ["monthly_income", "rent", "other_fixed", "living", "savings", "debt"],
      additionalProperties: false,
    },
  },
  {
    name: "official_links",
    description:
      "공식 신청·상담 창구 링크를 카드로 보여준다. 일자리, 직업훈련, 청년정책, 공공임대, 복지 신청, 법률상담, 마음 상담 창구가 필요할 때 사용한다.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        topics: { type: "array", items: { type: "string", enum: LINK_TOPICS } },
      },
      required: ["topics"],
      additionalProperties: false,
    },
  },
];

export const TOOL_LABELS: Record<string, string> = {
  search_welfare: "복지서비스 찾는 중",
  search_local_welfare: "우리 지역 지원 찾는 중",
  find_employment_center: "가까운 고용센터 찾는 중",
  search_recipes: "간단 레시피 찾는 중",
  search_culture_events: "무료 문화 행사 찾는 중",
  search_housing_notices: "임대주택 공고 찾는 중",
  search_youth_policies: "청년정책 찾는 중",
  get_rent_stats: "지역 월세 시세 확인 중",
  calc_scenarios: "3개월 생활비 계산 중",
  official_links: "공식 창구 정리 중",
};

const schemas = {
  search_welfare: z.object({ keyword: z.enum(WELFARE_KEYWORDS) }),
  search_local_welfare: z.object({
    sido: z.enum(SIDO_LIST),
    sigungu: z.string().max(20).regex(/^[가-힣0-9\s]*$/),
    keyword: z.enum(LOCAL_KEYWORDS),
  }),
  search_youth_policies: z.object({
    sido: z.enum(SIDO_LIST),
    sigungu: z.string().max(20).regex(/^[가-힣0-9\s]*$/),
    topic: z.enum(YOUTH_TOPICS),
    keyword: z.string().max(10).regex(/^[가-힣A-Za-z0-9]*$/),
    age: z.number().int().min(0).max(60),
  }),
  search_housing_notices: z.object({
    sido: z.enum(SIDO_LIST),
    sigungu: z.string().max(20).regex(/^[가-힣0-9\s]*$/),
  }),
  search_culture_events: z.object({
    sido: z.enum(SIDO_LIST),
    sigungu: z.string().max(20).regex(/^[가-힣0-9\s]*$/),
    free_only: z.boolean(),
  }),
  search_recipes: z.object({
    ingredients: z.array(z.string().regex(/^[가-힣A-Za-z0-9]{1,10}$/)).min(1).max(4),
    goal: z.enum(["simple", "low_sodium"]),
  }),
  find_employment_center: z.object({
    sido: z.enum(SIDO_LIST),
    sigungu: z.string().max(20).regex(/^[가-힣0-9\s]*$/),
  }),
  get_rent_stats: z.object({ region: z.enum(REGION_NAMES) }),
  calc_scenarios: z.object({
    monthly_income: z.number().min(0).max(10_000),
    rent: z.number().min(0).max(10_000),
    other_fixed: z.number().min(0).max(10_000),
    living: z.number().min(0).max(10_000),
    savings: z.number().min(0).max(1_000_000),
    debt: z.number().min(0).max(1_000_000),
  }),
  official_links: z.object({ topics: z.array(z.enum(LINK_TOPICS as [string, ...string[]])).min(1).max(7) }),
};

export interface ToolOutcome {
  /** 모델에게 돌려줄 결과 (JSON 문자열) */
  content: string;
  isError: boolean;
  card?: Card;
}

/**
 * 시도·시군구 글자와 맞는, 우리가 아는 5자리 시군구 코드들. '성남시'처럼 구가 여럿이면 코드도 여럿(3개)이다.
 * 구까지 말했으면 그 구 하나만. 아는 지역이 아니면 빈 목록.
 */
function lawdsFor(sido: string, sigungu: string): string[] {
  const sg = sigungu.replace(/\s/g, "");
  if (!sg) return [];
  const withGu = REGIONS.filter((r) => shortSido(r.sido) === sido && r.gu && sg.includes(r.gu));
  if (withGu.length > 0) return withGu.map((r) => r.lawd);
  return REGIONS.filter((r) => shortSido(r.sido) === sido && sg.includes(r.sgg.replace(/(시|군|구)$/, ""))).map((r) => r.lawd);
}

const man = (v: number) => Math.round(v * 10_000);

/** 모델이 요청한 도구를 검증 후 실행한다. 허용 목록 밖의 이름·값은 실행하지 않는다. */
export async function runTool(name: string, input: unknown): Promise<ToolOutcome> {
  switch (name) {
    case "search_welfare": {
      const p = schemas.search_welfare.safeParse(input);
      if (!p.success) return invalid(p.error);
      const result = await searchWelfare(p.data.keyword);
      return {
        content: JSON.stringify(result),
        isError: false,
        card: { kind: "welfare", keyword: p.data.keyword, result },
      };
    }
    case "search_local_welfare": {
      const p = schemas.search_local_welfare.safeParse(input);
      if (!p.success) return invalid(p.error);
      const result = await searchLocalWelfareByArea(SIDO_API_NAME[p.data.sido], p.data.sigungu, p.data.keyword);
      const regionLabel = [p.data.sido, p.data.sigungu].filter(Boolean).join(" ");
      return {
        content: JSON.stringify(result),
        isError: false,
        card: { kind: "localWelfare", region: regionLabel, keyword: p.data.keyword, result },
      };
    }
    case "search_youth_policies": {
      const p = schemas.search_youth_policies.safeParse(input);
      if (!p.success) return invalid(p.error);
      const d = p.data;
      const result = await searchYouthPolicies({ ...d, lawds: lawdsFor(d.sido, d.sigungu) });
      const area = [d.sido, d.sigungu].filter(Boolean).join(" ");
      const brief =
        result.status === "ok"
          ? {
              area,
              topic: d.topic,
              matchedTotal: result.items.matched,
              policies: result.items.policies.map((x) => ({
                name: x.name, category: x.category, institution: x.institution, scope: x.scope,
                timing: x.period, daysLeft: x.daysLeft, notStartedYet: x.upcoming,
                age: x.ageText, income: x.incomeText, support: x.support.slice(0, 160),
                forFosterYouth: x.forFosterYouth,
              })),
              note: "신청 자격(소득·연령·거주 요건)은 정책마다 달라 판정하지 말고 원문에서 확인하라고 안내. scope: local=내 지역 한정, sido=시도 단위, national=전국",
            }
          : result;
      return { content: JSON.stringify(brief), isError: false, card: { kind: "youth", area, topic: d.topic, result } };
    }
    case "search_housing_notices": {
      const p = schemas.search_housing_notices.safeParse(input);
      if (!p.success) return invalid(p.error);
      const result = await searchHousingNotices(p.data.sido, p.data.sigungu);
      const area = [p.data.sido, p.data.sigungu].filter(Boolean).join(" ");
      const brief =
        result.status === "ok"
          ? {
              area,
              closedRecently: result.items.closedRecently,
              notices: result.items.notices.map((n) => ({
                title: n.title, region: n.region, subtype: n.subtype, status: n.status,
                period: `${n.postedAt}~${n.deadline}`, daysLeft: n.daysLeft,
              })),
              note: "신청 자격(소득·자산·연령·자립준비청년 해당 여부)은 이 데이터에 없다. 공고문에서 확인하라고 안내",
            }
          : result;
      return { content: JSON.stringify(brief), isError: false, card: { kind: "housing", area, result } };
    }
    case "search_culture_events": {
      const p = schemas.search_culture_events.safeParse(input);
      if (!p.success) return invalid(p.error);
      const result = await searchCultureEvents(p.data.sido, p.data.sigungu, p.data.free_only);
      const area = [p.data.sido, p.data.sigungu].filter(Boolean).join(" ");
      const brief =
        result.status === "ok"
          ? {
              area,
              freeOnly: result.items.freeOnly,
              checked: result.items.checked,
              // 가격을 확인하지 못한 행사는 무료 여부를 모른다. 무료가 아니라고 말하면 안 된다.
              unchecked: result.items.unchecked,
              events: result.items.events.map((e) => ({
                title: e.title, period: `${e.start}~${e.end}`, place: e.place, realm: e.realm,
                price: e.price || "가격 정보 없음", free: e.free, address: e.address,
              })),
            }
          : result;
      return { content: JSON.stringify(brief), isError: false, card: { kind: "culture", area, result } };
    }
    case "search_recipes": {
      const p = schemas.search_recipes.safeParse(input);
      if (!p.success) return invalid(p.error);
      const result = await searchRecipes(p.data.ingredients, p.data.goal);
      const brief =
        result.status === "ok"
          ? {
              matchedAll: result.items.matchedAll,
              sampleKey: result.items.sampleKey,
              recipes: result.items.recipes.map((r) => ({
                name: r.name,
                category: r.category,
                ingredients: r.ingredients,
                steps: r.steps,
                tip: r.tip,
                tags: r.tags,
                // 열량이 영양소와 맞지 않으면 수치를 모델에게 주지 않는다.
                nutrition: r.nutritionConsistent
                  ? { energy_kcal: r.energy, carb_g: r.carb, protein_g: r.protein, fat_g: r.fat, sodium_mg: r.sodium }
                  : { sodium_mg: r.sodium, note: "열량·영양소 수치가 서로 맞지 않아 확정해서 말하지 말 것" },
              })),
            }
          : result;
      return {
        content: JSON.stringify(brief),
        isError: false,
        card: { kind: "recipes", ingredients: p.data.ingredients, result },
      };
    }
    case "find_employment_center": {
      const p = schemas.find_employment_center.safeParse(input);
      if (!p.success) return invalid(p.error);
      const result = findCenters(p.data.sido, p.data.sigungu);
      const brief = result.centers.slice(0, 5).map((c) => ({
        name: c.name, address: c.addr, tel: c.tel, match: c.match,
      }));
      return {
        content: JSON.stringify({
          scope: result.scope,
          note:
            result.scope === "none"
              ? "이 지역 센터 정보가 목록에 없음. 고용24 센터 조회 페이지나 1350으로 안내"
              : "match: location=같은 구에 있음, city=같은 시에 있음, name=센터 이름으로 추정한 관할, sido=같은 시도의 센터. 관할 구역과 신청 방법은 전화로 확인하도록 안내",
          centers: brief,
        }),
        isError: false,
        card: { kind: "centers", result },
      };
    }
    case "get_rent_stats": {
      const p = schemas.get_rent_stats.safeParse(input);
      if (!p.success) return invalid(p.error);
      const lawd = REGIONS.find((r) => r.name === p.data.region)!.lawd;
      const result = await getRentStats(lawd);
      return {
        content: JSON.stringify({
          region: p.data.region,
          unit: "만원",
          note: "small은 1인 가구가 주로 구하는 전용 40㎡ 이하 월세. 청년에게는 small 수치를 우선 안내",
          ...result,
        }),
        isError: false,
        card: { kind: "rent", region: p.data.region, result },
      };
    }
    case "calc_scenarios": {
      const p = schemas.calc_scenarios.safeParse(input);
      if (!p.success) return invalid(p.error);
      const d = p.data;
      const results = calcScenarios({
        nickname: "나",
        region: "",
        monthsSinceLeaving: 0,
        monthlyIncome: man(d.monthly_income),
        rent: man(d.rent),
        otherFixedCosts: man(d.other_fixed),
        livingCosts: man(d.living),
        savings: man(d.savings),
        debt: man(d.debt),
        certificates: [],
      });
      const brief = results.map((r) => ({
        title: r.title,
        endBalance_manwon: Math.round(r.endBalance / 10_000),
        shortfallMonth: r.shortfallMonth,
        risks: r.risks,
      }));
      return {
        content: JSON.stringify({ note: "가정값을 사용한 참고 계산", scenarios: brief }),
        isError: false,
        card: { kind: "scenario", results },
      };
    }
    case "official_links": {
      const p = schemas.official_links.safeParse(input);
      if (!p.success) return invalid(p.error);
      const links = p.data.topics.map((t) => OFFICIAL_LINKS[t as keyof typeof OFFICIAL_LINKS]);
      return {
        content: JSON.stringify({ shown: links.map((l) => l.title) }),
        isError: false,
        card: { kind: "links", links },
      };
    }
    default:
      return { content: `알 수 없는 도구: ${name}`, isError: true };
  }
}

function invalid(err: z.ZodError): ToolOutcome {
  return { content: `입력값 오류: ${err.issues.map((i) => i.message).join(", ")}`, isError: true };
}
