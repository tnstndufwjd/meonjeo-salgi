import type { Source } from "@/lib/publicapi/datagokr";

export function SourceNote({ source }: { source: Source }) {
  const d = new Date(source.fetchedAt);
  return (
    <p className="mt-3 text-[11px] text-muted">
      출처:{" "}
      <a href={source.url} target="_blank" rel="noreferrer" className="underline">
        {source.name}
      </a>{" "}
      · 조회 {d.toLocaleDateString("ko-KR")}
    </p>
  );
}

export function Unavailable({ reason, source }: { reason: string; source: Source }) {
  return (
    <div className="rounded-xl bg-surface p-3 text-sm">
      <p>지금은 데이터를 불러올 수 없어요. {reason}</p>
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block font-medium text-accent underline"
      >
        공식 사이트에서 직접 확인하기
      </a>
    </div>
  );
}
