"use client";

import { useEffect, useState } from "react";
import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { LocalWelfareItem } from "@/lib/publicapi/localWelfare";
import type { WelfareItem } from "@/lib/publicapi/welfare";
import type { YouthProfile } from "@/lib/profile";
import { findCenters, shortSido } from "@/lib/centers";
import { regionOf } from "@/lib/regions";
import { CenterCard } from "./CenterCard";
import { ChatCard } from "./ChatCards";
import { SourceNote, Unavailable } from "./SourceNote";

type Welfare = ApiResult<WelfareItem[]>;

/** 고용24 OpenAPI 키 승인 전에는 공식 검색으로 연결한다 (가짜 공고를 만들지 않음). */
function OfficialLinkCard(props: { title: string; desc: string; href: string; cta: string }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-base font-bold">{props.title}</h3>
      <p className="mt-1 text-sm text-muted">{props.desc}</p>
      <a
        href={props.href}
        target="_blank"
        rel="noreferrer"
        role="button"
        className="mt-3 flex items-center justify-center rounded-full border border-hairline px-4 text-sm font-medium"
      >
        {props.cta}
      </a>
    </section>
  );
}

function WelfareCard({ keyword }: { keyword: string }) {
  const [data, setData] = useState<Welfare | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/welfare?q=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((j: Welfare) => alive && setData(j))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [keyword]);

  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-base font-bold">‘{keyword}’ 관련 복지서비스</h3>
      <p className="mt-1 text-xs text-muted">
        조건에 해당할 가능성이 있는 제도예요. 자격은 신청처에서 꼭 확인해 주세요.
      </p>
      <div className="mt-3">
        {!data && <p className="text-sm text-muted">불러오는 중…</p>}
        {data?.status === "unavailable" && <Unavailable reason={data.reason} source={data.source} />}
        {data?.status === "ok" && (
          <>
            {data.items.length === 0 && <p className="text-sm">찾은 제도가 없어요.</p>}
            <ul className="flex flex-col gap-3">
              {data.items.map((w) => (
                <li key={w.id} className="rounded-xl bg-surface p-3">
                  <p className="text-sm font-medium">{w.name}</p>
                  {w.summary && <p className="mt-1 line-clamp-3 text-xs text-muted">{w.summary}</p>}
                  <p className="mt-1 text-[11px] text-muted">
                    {[w.ministry, w.supportType, w.onlineApply ? "온라인 신청 가능" : "", w.contact && `문의 ${w.contact}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <a href={w.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-accent underline">
                    복지로에서 자세히 보기
                  </a>
                </li>
              ))}
            </ul>
            <SourceNote source={data.source} />
          </>
        )}
      </div>
    </section>
  );
}

function LocalWelfareCard({ region }: { region: string }) {
  const [data, setData] = useState<ApiResult<LocalWelfareItem[]> | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/local-welfare?region=${encodeURIComponent(region)}&q=${encodeURIComponent("청년")}`)
      .then((r) => r.json())
      .then((j: ApiResult<LocalWelfareItem[]>) => alive && setData(j))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [region]);

  if (!data) return null;
  return <ChatCard card={{ kind: "localWelfare", region, keyword: "청년", result: data }} />;
}

export function SupportCards({ profile }: { profile: YouthProfile }) {
  const job = profile.desiredJob ? `‘${profile.desiredJob}’ ` : "";
  const region = regionOf(profile.region);
  const sido = region && shortSido(region.sido);
  const centerResult = region && sido ? findCenters(sido, region.sgg + (region.gu ?? "")) : null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">도움받을 수 있는 곳</h2>
      <LocalWelfareCard region={profile.region} />
      <WelfareCard keyword="자립" />
      <WelfareCard keyword="청년" />
      {centerResult && <CenterCard result={centerResult} />}
      <OfficialLinkCard
        title="일자리 찾기"
        desc={`${profile.region} 근처 ${job}채용 공고를 고용24에서 찾아보세요.`}
        href="https://www.work24.go.kr"
        cta="고용24 채용정보 열기"
      />
      <OfficialLinkCard
        title="국비 직업훈련 (국민내일배움카드)"
        desc="훈련 시나리오를 고른다면, 훈련비 지원 과정을 먼저 확인해 보세요."
        href="https://m.work24.go.kr/hr/a/a/1100/trnnCrsInf.do"
        cta="훈련과정 검색 열기"
      />
      <OfficialLinkCard
        title="청년정책 한눈에 (온통청년)"
        desc="주거·금융·일자리 청년정책을 지역별로 찾아볼 수 있어요."
        href="https://www.youthcenter.go.kr"
        cta="온통청년 열기"
      />
    </div>
  );
}
