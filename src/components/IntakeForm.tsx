"use client";

import { useState } from "react";
import { crisisCheck } from "@/lib/crisis";
import { DEMO_PERSONA, type YouthProfile } from "@/lib/profile";
import { CrisisCard } from "./CrisisCard";

import { REGIONS } from "@/lib/regions";

interface Draft {
  region: string;
  monthsSinceLeaving: string;
  monthlyIncome: string; // 만원
  rent: string;
  otherFixedCosts: string;
  livingCosts: string;
  savings: string;
  debt: string;
  desiredJob: string;
  concern: string;
}

const toMan = (won: number) => String(won / 10_000);
const num = (s: string) => Math.max(0, Number(s) || 0);

const EMPTY: Draft = {
  region: "대전 서구",
  monthsSinceLeaving: "",
  monthlyIncome: "",
  rent: "",
  otherFixedCosts: "",
  livingCosts: "",
  savings: "",
  debt: "0",
  desiredJob: "",
  concern: "",
};

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{props.label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 focus-within:border-foreground">
        <input
          inputMode="numeric"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className="min-h-11 w-full bg-transparent text-base outline-none"
          placeholder="0"
        />
        {props.unit && <span className="shrink-0 text-sm text-muted">{props.unit}</span>}
      </div>
      {props.hint && <span className="mt-1 block text-xs text-muted">{props.hint}</span>}
    </label>
  );
}

export function IntakeForm({ onSubmit }: { onSubmit: (p: YouthProfile) => void }) {
  const [d, setD] = useState<Draft>(EMPTY);
  const [crisis, setCrisis] = useState(false);
  const set = (k: keyof Draft) => (v: string) => setD((prev) => ({ ...prev, [k]: v }));

  function fillDemo() {
    const p = DEMO_PERSONA;
    setD({
      region: p.region,
      monthsSinceLeaving: String(p.monthsSinceLeaving),
      monthlyIncome: toMan(p.monthlyIncome),
      rent: toMan(p.rent),
      otherFixedCosts: toMan(p.otherFixedCosts),
      livingCosts: toMan(p.livingCosts),
      savings: toMan(p.savings),
      debt: toMan(p.debt),
      desiredJob: p.desiredJob ?? "",
      concern: "월세 내고 나니 식비가 모자라요",
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (crisisCheck(d.concern).crisis) {
      setCrisis(true);
      return;
    }
    const w = (s: string) => Math.round(num(s) * 10_000);
    onSubmit({
      nickname: "나",
      region: d.region,
      monthsSinceLeaving: num(d.monthsSinceLeaving),
      monthlyIncome: w(d.monthlyIncome),
      rent: w(d.rent),
      otherFixedCosts: w(d.otherFixedCosts),
      livingCosts: w(d.livingCosts),
      savings: w(d.savings),
      debt: w(d.debt),
      desiredJob: d.desiredJob || undefined,
      certificates: [],
    });
  }

  if (crisis) return <CrisisCard onClose={() => setCrisis(false)} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">지금 상황을 알려주세요</h1>
        <p className="mt-1 text-sm text-muted">
          입력한 내용은 저장되지 않아요. 대략적인 숫자면 충분해요.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">사는 지역</span>
        <select
          value={d.region}
          onChange={(e) => set("region")(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-hairline bg-white px-3 text-base"
        >
          {REGIONS.map((r) => (
            <option key={r.lawd}>{r.name}</option>
          ))}
        </select>
      </label>

      <Field label="독립한 지 얼마나 됐나요" unit="개월" value={d.monthsSinceLeaving} onChange={set("monthsSinceLeaving")} />
      <Field label="한 달 수입" unit="만원" value={d.monthlyIncome} onChange={set("monthlyIncome")} />
      <Field label="월세(관리비 포함)" unit="만원" value={d.rent} onChange={set("rent")} />
      <Field label="통신·교통·공과금" unit="만원" value={d.otherFixedCosts} onChange={set("otherFixedCosts")} hint="매달 나가는 고정 지출" />
      <Field label="식비 등 생활비" unit="만원" value={d.livingCosts} onChange={set("livingCosts")} />
      <Field label="지금 모아둔 돈" unit="만원" value={d.savings} onChange={set("savings")} />
      <Field label="갚아야 할 빚" unit="만원" value={d.debt} onChange={set("debt")} />

      <label className="block">
        <span className="text-sm font-medium">하고 싶은 일 (선택)</span>
        <input
          value={d.desiredJob}
          onChange={(e) => set("desiredJob")(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-hairline bg-white px-3 text-base"
          placeholder="예: 사무보조, 요리, 디자인"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">요즘 가장 힘든 점 (선택)</span>
        <textarea
          value={d.concern}
          onChange={(e) => set("concern")(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-hairline bg-white p-3 text-base"
          placeholder="편하게 적어주세요"
        />
      </label>

      <div className="flex flex-col gap-2 pt-2">
        <button type="submit" className="rounded-full bg-foreground px-6 text-base font-medium text-background">
          시나리오 보기
        </button>
        <button type="button" onClick={fillDemo} className="rounded-full border border-hairline bg-white px-6 text-sm">
          예시(가상 인물 지윤)로 채우기
        </button>
      </div>
    </form>
  );
}
