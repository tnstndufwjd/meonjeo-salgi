"use client";

import { useMemo, useState } from "react";
import { manwon } from "@/lib/format";
import type { YouthProfile } from "@/lib/profile";
import { RentCheck } from "./RentCheck";
import { SupportCards } from "./SupportCards";
import {
  calcScenarios,
  DEFAULT_ASSUMPTIONS,
  type ScenarioResult,
} from "@/lib/scenario";

function Bars({ s, scale }: { s: ScenarioResult; scale: number }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
      {s.months.map((m) => {
        const h = Math.max(4, Math.round((Math.abs(m.balance) / scale) * 56));
        const neg = m.balance < 0;
        return (
          <div key={m.month} className="flex flex-col items-center">
            <div className="flex h-16 items-end">
              <div
                style={{ height: h }}
                className={`w-8 rounded-t ${neg ? "bg-danger" : "bg-ok"}`}
              />
            </div>
            <span className="mt-1 text-[11px] text-muted">{m.month}개월 후</span>
            <span className={`text-xs font-medium ${neg ? "text-danger" : ""}`}>
              {manwon(m.balance)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Card({ s, scale }: { s: ScenarioResult; scale: number }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-base font-bold">{s.title}</h3>
      <p className="mt-1 text-sm text-muted">{s.summary}</p>
      <Bars s={s} scale={scale} />
      <p className="mt-3 text-sm">
        3개월 뒤 잔액{" "}
        <strong className={s.endBalance < 0 ? "text-danger" : ""}>
          {manwon(s.endBalance)}
        </strong>
        {s.shortfallMonth && (
          <span className="ml-1 text-danger">
            · {s.shortfallMonth}개월 차 부족
          </span>
        )}
      </p>
      {s.risks.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-muted">
          {s.risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ScenarioView({
  profile,
  onBack,
}: {
  profile: YouthProfile;
  onBack: () => void;
}) {
  const [newJob, setNewJob] = useState(String(DEFAULT_ASSUMPTIONS.newJobIncome / 10_000));
  const [newRent, setNewRent] = useState(String(DEFAULT_ASSUMPTIONS.newRent / 10_000));

  const results = useMemo(
    () =>
      calcScenarios(profile, {
        ...DEFAULT_ASSUMPTIONS,
        newJobIncome: Math.round((Number(newJob) || 0) * 10_000),
        newRent: Math.round((Number(newRent) || 0) * 10_000),
      }),
    [profile, newJob, newRent],
  );

  const scale = Math.max(
    1,
    ...results.flatMap((r) => r.months.map((m) => Math.abs(m.balance))),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">앞으로 3개월, 세 가지 길</h1>
        <p className="mt-1 text-sm text-muted">
          지금 모아둔 돈 {manwon(profile.savings - profile.debt)}에서 시작해 계산했어요.
        </p>
      </div>

      {results.map((s) => (
        <Card key={s.id} s={s} scale={scale} />
      ))}

      <details className="rounded-2xl bg-brand-soft p-4 text-sm">
        <summary className="cursor-pointer font-medium">계산에 쓴 가정 바꿔보기</summary>
        <p className="mt-2 text-xs text-muted">
          실제 값이 아닌 예시예요. 직접 바꾸면 결과가 바로 달라져요.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <label className="block">
            취업 후 월 소득 (만원)
            <input
              inputMode="numeric"
              value={newJob}
              onChange={(e) => setNewJob(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 min-h-11 w-full rounded-xl border border-hairline bg-white px-3"
            />
          </label>
          <label className="block">
            옮길 곳 월세 (만원)
            <input
              inputMode="numeric"
              value={newRent}
              onChange={(e) => setNewRent(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 min-h-11 w-full rounded-xl border border-hairline bg-white px-3"
            />
          </label>
        </div>
      </details>

      <div className="pt-4">
        <SupportCards profile={profile} />
      </div>

      <RentCheck profile={profile} />

      <p className="text-xs text-muted">
        AI가 정리한 참고용 계산이에요. 실제 지원 자격과 신청은 공식 창구에서 확인해 주세요.
      </p>

      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-hairline bg-white px-6 text-sm"
      >
        내용 다시 입력하기
      </button>
    </div>
  );
}
