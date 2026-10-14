import type { ApiResult } from "@/lib/publicapi/datagokr";
import type { Recipe, RecipeSearch } from "@/lib/publicapi/recipes";
import { SourceNote, Unavailable } from "./SourceNote";

const fmt = (v: number | null, unit: string) => (v === null ? "-" : `${Math.round(v * 10) / 10}${unit}`);

function Nutrition({ r }: { r: Recipe }) {
  return (
    <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px]">
      <p className="text-muted">
        DB에 적힌 영양 수치{!r.nutritionConsistent && " · 항목끼리 맞지 않아 참고만 해요"}
      </p>
      <p className="mt-0.5 flex flex-wrap gap-x-3">
        <span>열량 {fmt(r.energy, "kcal")}</span>
        <span>탄수화물 {fmt(r.carb, "g")}</span>
        <span>단백질 {fmt(r.protein, "g")}</span>
        <span>지방 {fmt(r.fat, "g")}</span>
        <span className="font-medium">나트륨 {fmt(r.sodium, "mg")}</span>
      </p>
    </div>
  );
}

/** 간단 레시피 카드. 영양 수치는 DB 표기값이라 서로 안 맞으면 '참고용' 표시를 붙인다. */
export function RecipeCard({ ingredients, result }: { ingredients: string[]; result: ApiResult<RecipeSearch> }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <h3 className="text-sm font-bold">‘{ingredients.join(", ")}’로 만드는 간단 레시피</h3>
      <div className="mt-2">
        {result.status === "unavailable" ? (
          <Unavailable reason={result.reason} source={result.source} />
        ) : result.items.recipes.length === 0 ? (
          <p className="text-sm">이 재료로 찾은 레시피가 없어요. 다른 재료로 다시 물어봐 줘요.</p>
        ) : (
          <>
            {!result.items.matchedAll && ingredients.length > 1 && (
              <p className="mb-2 text-xs text-muted">재료를 모두 쓰는 레시피는 없어서, 일부만 쓰는 것을 보여드려요.</p>
            )}
            <ul className="flex flex-col gap-3">
              {result.items.recipes.map((r) => (
                <li key={r.id} className="rounded-xl bg-surface p-3">
                  <div className="flex gap-3">
                    {r.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image} alt={r.name} width={72} height={72} loading="lazy" className="size-[72px] shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-[11px] text-muted">{[r.category, r.method].filter(Boolean).join(" · ")}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px]">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.tip && (
                    <p className="mt-2 rounded-lg bg-brand-soft px-2 py-1.5 text-xs">
                      <span className="font-medium">짜지 않게 </span>
                      {r.tip}
                    </p>
                  )}
                  <Nutrition r={r} />
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium">재료와 만드는 법</summary>
                    <p className="mt-1 text-muted">{r.ingredients}</p>
                    <ol className="mt-2 list-decimal pl-4">
                      {r.steps.map((s, i) => (
                        <li key={i} className="mt-1">{s.replace(/^\d+\.\s*/, "")}</li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ul>
            {result.items.sampleKey && (
              <p className="mt-2 text-[11px] text-muted">지금은 시험용 키라 결과를 일부만 보여드려요.</p>
            )}
            <SourceNote source={result.source} />
          </>
        )}
      </div>
    </section>
  );
}
