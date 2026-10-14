import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { YouthPolicy, YouthSearch } from "@/lib/publicapi/youth";
import { SourceNote, Unavailable } from "./SourceNote";

const SCOPE: Record<YouthPolicy["scope"], string> = {
  local: "우리 지역",
  sido: "시·도 단위",
  national: "전국",
};

function Timing({ p }: { p: YouthPolicy }) {
  if (p.timing === "always") return <span className="rounded-full bg-brand px-2 py-0.5 text-foreground">상시 신청</span>;
  if (p.timing === "period") {
    const soon = p.daysLeft !== null && p.daysLeft <= 7;
    return (
      <span className={`rounded-full px-2 py-0.5 ${soon ? "bg-red-50 font-medium text-danger" : "bg-white"}`}>
        {p.upcoming ? "곧 시작 · " : ""}
        {p.period}
        {p.daysLeft !== null && !p.upcoming ? (p.daysLeft === 0 ? " · 오늘 마감" : ` · D-${p.daysLeft}`) : ""}
      </span>
    );
  }
  return <span className="rounded-full bg-white px-2 py-0.5 text-muted">{p.period}</span>;
}

/** 청년정책 카드. 소득·연령 등 신청 조건은 원문 그대로 보여주고 판정하지 않는다. */
export function YouthPolicyCard({ area, topic, result }: { area: string; topic: string; result: ApiResult<YouthSearch> }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-sm font-bold">
        {area} 청년정책{topic !== "전체" && ` · ${topic === "자립준비청년" ? "자립준비청년" : topic}`}
      </h3>
      <div className="mt-2">
        {result.status === "unavailable" ? (
          <Unavailable reason={result.reason} source={result.source} />
        ) : result.items.policies.length === 0 ? (
          <p className="text-sm">지금 신청할 수 있는 정책을 찾지 못했어요. 조건을 바꿔 다시 물어봐 줘요.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">
              조건에 맞는 정책 {result.items.matched}건 중 {result.items.policies.length}건을 보여드려요.
            </p>
            <ul className="flex flex-col gap-3">
              {result.items.policies.map((p) => (
                <li key={p.id} className="rounded-xl bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded-full bg-brand-soft px-2 py-0.5">{SCOPE[p.scope]}</span>
                    {p.forFosterYouth && <span className="rounded-full bg-brand px-2 py-0.5 font-medium">자립준비청년 관련</span>}
                  </div>
                  <p className="mt-1 text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted">
                    {[p.category, p.institution].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs text-muted">{p.support}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <Timing p={p} />
                    <span className="rounded-full bg-white px-2 py-0.5">{p.ageText}</span>
                    <span className="rounded-full bg-white px-2 py-0.5">{p.incomeText}</span>
                  </p>
                  {p.how && <p className="mt-1 line-clamp-2 text-[11px] text-muted">신청: {p.how}</p>}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 flex min-h-9 items-center text-xs font-medium text-accent underline">
                      자세히 보기·신청
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">신청 자격은 정책마다 달라요. 원문에서 꼭 확인해 주세요.</p>
            <SourceNote source={result.source} />
          </>
        )}
      </div>
    </section>
  );
}
