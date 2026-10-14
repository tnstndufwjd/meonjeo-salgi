import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { HousingSearch } from "@/lib/publicapi/housing";
import { SourceNote, Unavailable } from "./SourceNote";

function dday(n: number | null): string {
  if (n === null) return "";
  if (n === 0) return "오늘 마감";
  return `마감 D-${n}`;
}

/** LH 임대주택·주거복지 공고 카드. 신청 자격은 판정하지 않고 공고문 링크로 보낸다. */
export function HousingCard({ area, result }: { area: string; result: ApiResult<HousingSearch> }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-sm font-bold">{area} 접수 중인 임대주택 공고</h3>
      <div className="mt-2">
        {result.status === "unavailable" ? (
          <Unavailable reason={result.reason} source={result.source} />
        ) : result.items.notices.length === 0 ? (
          <div className="rounded-xl bg-surface p-3 text-sm">
            <p>지금 접수 중인 LH 임대주택·매입임대 공고를 찾지 못했어요.</p>
            {result.items.closedRecently > 0 && (
              <p className="mt-1 text-xs text-muted">최근 3개월 안에 마감된 공고는 {result.items.closedRecently}건 있었어요. 다음 모집을 기다려 볼 수 있어요.</p>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {result.items.notices.map((n) => (
                <li key={n.id} className="rounded-xl bg-surface p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-brand-soft px-2 py-0.5">{n.subtype || n.type}</span>
                    <span className="text-muted">{n.region}</span>
                    <span className="text-muted">
                      {n.postedAt} ~ {n.deadline}
                    </span>
                    {n.daysLeft !== null && (
                      <span className={`font-medium ${n.daysLeft <= 3 ? "text-danger" : ""}`}>{dday(n.daysLeft)}</span>
                    )}
                    <span className="text-muted">{n.status}</span>
                  </p>
                  {n.url && (
                    <a href={n.url} target="_blank" rel="noreferrer" className="mt-1 flex min-h-9 items-center text-xs font-medium text-accent underline">
                      공고문 보기 (LH청약플러스)
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">신청 자격(소득·자산·나이 등)은 공고마다 달라요. 공고문에서 꼭 확인해 주세요.</p>
            <SourceNote source={result.source} />
          </>
        )}
      </div>
    </section>
  );
}
