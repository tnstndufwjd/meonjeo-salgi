import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { CultureSearch } from "@/lib/publicapi/culture";
import { SourceNote, Unavailable } from "./SourceNote";

/** 공연·전시·행사 카드. 가격은 DB에 적힌 그대로 보여주고, 예약·변동은 링크에서 확인하게 한다. */
export function CultureCard({ area, result }: { area: string; result: ApiResult<CultureSearch> }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-sm font-bold">{area} 문화 행사 (앞으로 30일)</h3>
      <div className="mt-2">
        {result.status === "unavailable" ? (
          <Unavailable reason={result.reason} source={result.source} />
        ) : result.items.events.length === 0 ? (
          <p className="text-sm">
            {result.items.freeOnly
              ? `이 지역에서 무료로 표시된 행사를 찾지 못했어요 (${result.items.checked}건 확인${
                  result.items.unchecked > 0 ? `, ${result.items.unchecked}건은 가격을 확인하지 못했어요` : ""
                }).`
              : "이 지역에서 찾은 행사가 없어요."}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {result.items.events.map((e) => (
                <li key={e.id} className="rounded-xl bg-surface p-3">
                  <div className="flex gap-3">
                    {e.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-[11px] text-muted">
                        {[e.realm, `${e.start} ~ ${e.end}`].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[11px] text-muted">{e.place}</p>
                    </div>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${e.free ? "bg-brand text-foreground" : "bg-white"}`}>
                      {!e.priceKnown ? "가격 확인 못 함" : e.price ? `가격 ${e.price}` : "가격 정보 없음"}
                    </span>
                    {e.address && <span className="text-muted">{e.address}</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs font-medium">
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noreferrer" className="flex min-h-9 items-center text-accent underline">
                        자세히 보기·예약
                      </a>
                    )}
                    {e.phone && /\d/.test(e.phone) && (
                      <span className="flex min-h-9 items-center text-muted">{e.phone}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">가격과 일정은 바뀔 수 있어요. 가기 전에 링크에서 확인해 주세요.</p>
            <SourceNote source={result.source} />
          </>
        )}
      </div>
    </section>
  );
}
