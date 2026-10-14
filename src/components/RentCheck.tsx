"use client";

import { useEffect, useState } from "react";
import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { RentStats } from "@/lib/publicapi/rent";
import type { YouthProfile } from "@/lib/profile";
import { lawdOf } from "@/lib/regions";
import { SourceNote, Unavailable } from "./SourceNote";

type Rent = ApiResult<RentStats>;

/** 판정(안전/위험)은 하지 않고, 확인할 항목만 안내한다. */
export const CHECKLIST = [
  "등기부등본으로 집주인(소유자)이 계약하는 사람과 같은지 확인하기",
  "등기부등본에 근저당 등 먼저 잡힌 빚이 얼마인지 확인하기",
  "건축물대장에서 위반건축물이 아닌지, 용도가 주택인지 확인하기",
  "전세라면 보증금 반환보증에 가입할 수 있는 집인지 미리 확인하기",
  "계약 후 바로 전입신고와 확정일자 받기",
  "모르는 특약은 서명 전에 자립지원 선생님이나 무료 법률상담에 물어보기",
];

export function RentCheck({ profile }: { profile: YouthProfile }) {
  const lawd = lawdOf(profile.region);
  const [data, setData] = useState<Rent | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  useEffect(() => {
    if (!lawd) return;
    let alive = true;
    fetch(`/api/rent?lawd=${lawd}`)
      .then((r) => r.json())
      .then((j: Rent) => alive && setData(j))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [lawd]);

  const myRentMan = Math.round(profile.rent / 10_000);

  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h2 className="text-xl font-bold">첫 계약 점검</h2>
      <p className="mt-1 text-xs text-muted">
        집이 안전한지 판단해 주는 기능은 아니에요. 계약 전에 확인할 것들을 알려드려요.
      </p>

      <div className="mt-3">
        {!lawd && <p className="text-sm text-muted">이 지역은 아직 시세 정보를 지원하지 않아요.</p>}
        {lawd && !data && <p className="text-sm text-muted">이 지역 시세를 불러오는 중…</p>}
        {data?.status === "unavailable" && <Unavailable reason={data.reason} source={data.source} />}
        {data?.status === "ok" && (
          <div className="rounded-xl bg-brand-soft p-3 text-sm">
            <p className="font-medium">{profile.region} 최근 3개월 원룸·소형(전용 40㎡ 이하) 월세 {data.items.small.count}건</p>
            {data.items.small.count > 0 ? (
              <p className="mt-1">
                중간값: 보증금 {data.items.small.medianDeposit.toLocaleString("ko-KR")}만원, 월세{" "}
                {data.items.small.medianRent.toLocaleString("ko-KR")}만원
                <span className="mt-1 block text-xs text-muted">
                  아파트 포함 전체 월세 {data.items.monthly.count}건 중간값은 월세 {data.items.monthly.medianRent.toLocaleString("ko-KR")}만원이에요.
                </span>
                {myRentMan > 0 && (
                  <span className="mt-1 block text-xs text-muted">
                    지금 내는 월세 {myRentMan}만원(관리비 포함)과 비교해 보세요. 관리비는 실거래가에 포함되지 않아요.
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-1">최근 월세 계약 신고가 적어 비교하기 어려워요.</p>
            )}
            {data.items.jeonse.count > 0 && (
              <p className="mt-1 text-xs text-muted">
                전세 {data.items.jeonse.count}건, 보증금 중간값 {data.items.jeonse.medianDeposit.toLocaleString("ko-KR")}만원
              </p>
            )}
            <SourceNote source={data.source} />
          </div>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {CHECKLIST.map((item, i) => (
          <li key={item}>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                className="mt-0.5 size-5 shrink-0 accent-foreground"
              />
              <span className={checked[i] ? "text-muted line-through" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
