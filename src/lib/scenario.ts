import type { YouthProfile } from "./profile";

/**
 * 3개월 시나리오 계산. 금액 계산은 전부 코드로 하고 LLM은 결과 설명만 맡는다.
 * 아래 가정값은 데모용 기본값이며, 화면에 "가정"으로 표시해야 한다 (확정 수치 아님).
 */
export interface ScenarioAssumptions {
  /** 훈련 중 알바 소득 유지 비율 (0~1) */
  trainingIncomeRatio: number;
  /** 훈련 기간(개월) */
  trainingMonths: number;
  /** 훈련 후 취업 시 월 소득 (확인 필요: 최저임금 월 환산 등 공식 수치로 교체) */
  newJobIncome: number;
  /** 주거 전환 시 월 주거비 (예: 임대주택 월세) */
  newRent: number;
  /** 주거 전환 1회성 이사 비용 */
  movingCost: number;
}

export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  trainingIncomeRatio: 0.6,
  trainingMonths: 2,
  newJobIncome: 2_000_000,
  newRent: 250_000,
  movingCost: 300_000,
};

export type ScenarioId = "keep" | "train" | "move";

export interface MonthResult {
  month: number;
  income: number;
  expense: number;
  net: number;
  balance: number;
}

export interface ScenarioResult {
  id: ScenarioId;
  title: string;
  summary: string;
  months: MonthResult[];
  endBalance: number;
  /** 잔액이 0 아래로 내려가는 첫 달 (없으면 null) */
  shortfallMonth: number | null;
  risks: string[];
}

function simulate(
  start: number,
  incomeOf: (m: number) => number,
  expenseOf: (m: number) => number,
  extraOf: (m: number) => number = () => 0,
): { months: MonthResult[]; shortfallMonth: number | null } {
  let balance = start;
  let shortfallMonth: number | null = null;
  const months: MonthResult[] = [];
  for (let m = 1; m <= 3; m++) {
    const income = incomeOf(m);
    const expense = expenseOf(m) + extraOf(m);
    balance += income - expense;
    if (balance < 0 && shortfallMonth === null) shortfallMonth = m;
    months.push({ month: m, income, expense, net: income - expense, balance });
  }
  return { months, shortfallMonth };
}

export function calcScenarios(
  p: YouthProfile,
  a: ScenarioAssumptions = DEFAULT_ASSUMPTIONS,
): ScenarioResult[] {
  const baseExpense = p.rent + p.otherFixedCosts + p.livingCosts;
  const start = p.savings - p.debt;

  const keep = simulate(start, () => p.monthlyIncome, () => baseExpense);

  const train = simulate(
    start,
    (m) =>
      m <= a.trainingMonths
        ? Math.round(p.monthlyIncome * a.trainingIncomeRatio)
        : a.newJobIncome,
    () => baseExpense,
  );

  const move = simulate(
    start,
    () => p.monthlyIncome,
    () => baseExpense - p.rent + a.newRent,
    (m) => (m === 1 ? a.movingCost : 0),
  );

  const build = (
    id: ScenarioId,
    title: string,
    summary: string,
    r: ReturnType<typeof simulate>,
    risks: string[],
  ): ScenarioResult => ({
    id,
    title,
    summary,
    months: r.months,
    endBalance: r.months[r.months.length - 1].balance,
    shortfallMonth: r.shortfallMonth,
    risks,
  });

  return [
    build(
      "keep",
      "지금 상태 유지",
      "소득과 지출이 지금과 같다고 가정합니다.",
      keep,
      keep.shortfallMonth
        ? [`${keep.shortfallMonth}개월 차에 생활비가 부족해질 수 있어요.`]
        : [],
    ),
    build(
      "train",
      "훈련 후 취업",
      `훈련 ${a.trainingMonths}개월 동안 알바 소득이 줄고, 이후 취업한다고 가정합니다.`,
      train,
      [
        "취업 시점과 소득은 보장되지 않아요 (가정값).",
        ...(train.shortfallMonth
          ? [`훈련 중 ${train.shortfallMonth}개월 차에 생활비가 부족해질 수 있어요.`]
          : []),
      ],
    ),
    build(
      "move",
      "주거비 낮추기",
      "월세가 낮은 주거로 옮긴다고 가정합니다 (이사 비용 포함).",
      move,
      [
        "공공임대 등은 공고와 자격 확인이 필요해요.",
        "보증금 이전 비용은 반영하지 않았어요.",
      ],
    ),
  ];
}
