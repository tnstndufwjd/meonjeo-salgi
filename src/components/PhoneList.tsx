import { PHONES } from "@/lib/phones";

/** 전화로 바로 물어볼 수 있는 창구. 누르면 전화가 걸린다. */
export function PhoneList({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-label="전화 상담">
      <p className="text-xs text-muted">전화로 바로 물어볼 수도 있어요</p>
      <ul className={`mt-2 grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1"}`}>
        {PHONES.map((p) => (
          <li key={p.tel}>
            <a
              href={`tel:${p.tel}`}
              className="flex min-h-11 flex-col justify-center rounded-xl border border-hairline bg-white px-3 py-2"
            >
              <span className="text-sm font-medium">
                ☎ {p.tel} <span className="text-xs font-normal text-muted">{p.org}</span>
              </span>
              <span className="text-[11px] text-muted">
                {p.label}
                {p.hours && ` · ${p.hours}`}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
