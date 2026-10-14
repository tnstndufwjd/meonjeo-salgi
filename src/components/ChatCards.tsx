import type { Card } from "@/lib/agent/cards";
import { manwon } from "@/lib/format";
import { CenterCard } from "./CenterCard";
import { CultureCard } from "./CultureCard";
import { HousingCard } from "./HousingCard";
import { YouthPolicyCard } from "./YouthPolicyCard";
import { RecipeCard } from "./RecipeCard";
import { CHECKLIST } from "./RentCheck";
import { SourceNote, Unavailable } from "./SourceNote";

const box = "rounded-2xl border border-hairline bg-white p-4";

export function ChatCard({ card }: { card: Card }) {
  switch (card.kind) {
    case "welfare": {
      const r = card.result;
      return (
        <section className={box}>
          <h3 className="text-sm font-bold">‘{card.keyword}’ 관련 복지서비스</h3>
          <div className="mt-2">
            {r.status === "unavailable" ? (
              <Unavailable reason={r.reason} source={r.source} />
            ) : r.items.length === 0 ? (
              <p className="text-sm">찾은 제도가 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {r.items.map((w) => (
                  <li key={w.id} className="rounded-xl bg-surface p-3">
                    <p className="text-sm font-medium">{w.name}</p>
                    {w.summary && <p className="mt-1 line-clamp-3 text-xs text-muted">{w.summary}</p>}
                    <p className="mt-1 text-[11px] text-muted">
                      {[w.ministry, w.supportType, w.onlineApply ? "온라인 신청 가능" : ""].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs font-medium">
                      <a href={w.link} target="_blank" rel="noreferrer" className="text-accent underline">
                        복지로에서 확인하기
                      </a>
                      {w.contact && /^[\d-]+$/.test(w.contact) && (
                        <a href={`tel:${w.contact}`} className="text-accent underline">
                          문의 {w.contact}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {r.status === "ok" && <SourceNote source={r.source} />}
          </div>
        </section>
      );
    }
    case "centers":
      return <CenterCard result={card.result} />;
    case "recipes":
      return <RecipeCard ingredients={card.ingredients} result={card.result} />;
    case "culture":
      return <CultureCard area={card.area} result={card.result} />;
    case "housing":
      return <HousingCard area={card.area} result={card.result} />;
    case "youth":
      return <YouthPolicyCard area={card.area} topic={card.topic} result={card.result} />;
    case "localWelfare": {
      const r = card.result;
      return (
        <section className={box}>
          <h3 className="text-sm font-bold">
            {card.region} 지역 지원 (‘{card.keyword}’)
          </h3>
          <div className="mt-2">
            {r.status === "unavailable" ? (
              <Unavailable reason={r.reason} source={r.source} />
            ) : r.items.length === 0 ? (
              <p className="text-sm">이 지역에서 찾은 제도가 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {r.items.map((w) => (
                  <li key={w.id} className="rounded-xl bg-surface p-3">
                    <p className="text-sm font-medium">{w.name}</p>
                    {w.summary && <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-muted">{w.summary}</p>}
                    <p className="mt-1 text-[11px] text-muted">
                      {[w.area, w.dept, w.applyMethod && `신청: ${w.applyMethod}`].filter(Boolean).join(" · ")}
                    </p>
                    <a href={w.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-accent underline">
                      복지로에서 확인하기
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {r.status === "ok" && <SourceNote source={r.source} />}
          </div>
        </section>
      );
    }
    case "rent": {
      const r = card.result;
      return (
        <section className={box}>
          <h3 className="text-sm font-bold">{card.region} 최근 3개월 월세 시세</h3>
          <div className="mt-2 text-sm">
            {r.status === "unavailable" ? (
              <Unavailable reason={r.reason} source={r.source} />
            ) : r.items.monthly.count === 0 ? (
              <p>최근 월세 계약 신고가 적어 비교하기 어려워요.</p>
            ) : (
              <>
                {r.items.small.count > 0 && (
                  <p className="font-medium">
                    원룸·소형(전용 40㎡ 이하) {r.items.small.count}건: 보증금 {r.items.small.medianDeposit.toLocaleString("ko-KR")}만원, 월세{" "}
                    {r.items.small.medianRent.toLocaleString("ko-KR")}만원
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">
                  전체 월세 {r.items.monthly.count}건 중간값: 보증금 {r.items.monthly.medianDeposit.toLocaleString("ko-KR")}만원, 월세{" "}
                  {r.items.monthly.medianRent.toLocaleString("ko-KR")}만원 (아파트 포함)
                </p>
              </>
            )}
            {r.status === "ok" && <SourceNote source={r.source} />}
          </div>
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-medium">계약 전에 확인할 것 {CHECKLIST.length}가지</summary>
            <ul className="mt-2 list-disc pl-5 text-muted">
              {CHECKLIST.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        </section>
      );
    }
    case "scenario":
      return (
        <section className={box}>
          <h3 className="text-sm font-bold">3개월 뒤 잔액 비교 (가정값 사용)</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {card.results.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
                <span>{s.title}</span>
                <span className={s.endBalance < 0 || s.shortfallMonth ? "font-medium text-danger" : "font-medium"}>
                  {manwon(s.endBalance)}
                  {s.shortfallMonth ? ` · ${s.shortfallMonth}개월 차 부족` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      );
    case "links":
      return (
        <section className={box}>
          <h3 className="text-sm font-bold">바로 가기</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {card.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} {...(l.href.startsWith("tel:") ? {} : { target: "_blank", rel: "noreferrer" })} className="flex min-h-11 flex-col justify-center rounded-xl bg-surface px-3 py-2">
                  <span className="text-sm font-medium">{l.title}</span>
                  <span className="text-xs text-muted">{l.desc}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      );
  }
}
