import type { ReactNode } from "react";

/**
 * AI 답변의 간단한 마크다운(굵게 **, - 목록, 1. 목록)을 화면용으로 그린다.
 * HTML을 직접 넣지 않고 React 요소로만 만들어, 답변에 어떤 문자가 와도 스크립트가 실행되지 않는다.
 * 스트리밍 중 아직 닫히지 않은 ** 는 그대로 보였다가 곧 굵게 바뀐다.
 */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
}

const BULLET = /^\s*[-•*]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (BULLET.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET.test(lines[i])) items.push(lines[i++].replace(BULLET, "$1"));
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items.map((t, j) => (
            <li key={j}>{inline(t)}</li>
          ))}
        </ul>,
      );
    } else if (NUMBER.test(line)) {
      const items: string[] = [];
      while (i < lines.length && NUMBER.test(lines[i])) items.push(lines[i++].replace(NUMBER, "$1"));
      blocks.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items.map((t, j) => (
            <li key={j}>{inline(t)}</li>
          ))}
        </ol>,
      );
    } else {
      const heading = line.match(HEADING);
      const para: string[] = [heading ? heading[1] : line];
      i++;
      // 다음 빈 줄이나 목록이 나올 때까지 한 문단으로 묶는다
      while (i < lines.length && lines[i].trim() && !BULLET.test(lines[i]) && !NUMBER.test(lines[i]) && !HEADING.test(lines[i])) {
        para.push(lines[i++]);
      }
      blocks.push(
        <p key={key++} className={heading ? "font-bold" : undefined}>
          {inline(para.join(" "))}
        </p>,
      );
    }
  }

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
