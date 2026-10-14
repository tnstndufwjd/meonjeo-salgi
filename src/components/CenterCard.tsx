import { CENTERS_SOURCE, type CenterResult } from "@/lib/centers";

const MATCH_LABEL = {
  location: "내 지역에 있어요",
  city: "같은 시에 있어요 (구는 다를 수 있어요)",
  name: "이름으로 보아 내 지역을 맡는 센터예요 (추정)",
  sido: "같은 시·도의 센터예요",
} as const;

/** 고용센터 안내 카드. 가까운 센터 순서는 '행정구역 일치도'이며 실제 거리는 지도로 확인한다. */
export function CenterCard({ result }: { result: CenterResult }) {
  const where = [result.sido, result.sigungu].filter(Boolean).join(" ");
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-sm font-bold">{where} 고용센터</h3>

      {result.scope === "none" ? (
        <div className="mt-2 rounded-xl bg-surface p-3 text-sm">
          <p>이 지역 센터 정보가 목록에 없어요.</p>
          <a href={CENTERS_SOURCE.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-medium text-accent underline">
            고용24에서 센터 직접 찾기
          </a>
          <p className="mt-1 text-xs text-muted">또는 고용노동부 상담 ☎ 1350</p>
        </div>
      ) : (
        <>
          {result.scope === "sido" && (
            <p className="mt-1 text-xs text-muted">
              {result.sigungu ? `‘${result.sigungu}’에서 딱 맞는 센터를 찾지 못해` : "시·군·구를 몰라"} 같은 시·도의 센터를 보여드려요.
            </p>
          )}
          <ul className="mt-2 flex flex-col gap-2">
            {result.centers.slice(0, 5).map((c) => (
              <li key={c.name} className="rounded-xl bg-surface p-3">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">{MATCH_LABEL[c.match]}</p>
                <p className="mt-1 text-xs">{c.addr}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                  <a href={`tel:${c.tel.split("~")[0].trim()}`} className="flex min-h-9 items-center text-accent underline">
                    ☎ {c.tel}
                  </a>
                  <a href={c.mapUrl} target="_blank" rel="noreferrer" className="flex min-h-9 items-center text-accent underline">
                    지도에서 보기
                  </a>
                  {c.home && (
                    <a href={c.home} target="_blank" rel="noreferrer" className="flex min-h-9 items-center text-accent underline">
                      홈페이지
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            관할 구역과 준비 서류, 방문 예약 여부는 센터마다 달라요. 가기 전에 전화나 ☎ 1350으로 확인해 보세요.
          </p>
        </>
      )}

      <p className="mt-2 text-[11px] text-muted">
        출처:{" "}
        <a href={CENTERS_SOURCE.url} target="_blank" rel="noreferrer" className="underline">
          {CENTERS_SOURCE.name}
        </a>{" "}
        · 목록 기준 {CENTERS_SOURCE.fetchedAt}
      </p>
    </section>
  );
}
