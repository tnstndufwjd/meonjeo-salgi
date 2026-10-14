"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, ChatEvent, ChatTurn } from "@/lib/agent/cards";
import { OFFICIAL_LINKS } from "@/lib/agent/links";
import { CHARACTER, PILLARS, type PillarId } from "@/lib/character";
import { KEYWORD_PILLAR } from "@/lib/keywords";
import { ChatCard } from "./ChatCards";
import { CrisisCard } from "./CrisisCard";
import { PhoneList } from "./PhoneList";
import { RichText } from "./RichText";

interface Bubble {
  role: "user" | "assistant";
  text: string;
  cards: Card[];
  status?: string;
  crisis?: boolean;
  error?: string;
  done?: boolean;
}

const SUGGESTIONS = [
  "월세 내고 나니 식비가 모자라",
  "보호 끝난 지 6개월인데 받을 수 있는 지원이 있어?",
  "알바만 하는데 직업훈련 받아볼까 고민돼",
  "이사 가려는데 계약할 때 뭘 봐야 해?",
  "냉장고에 라면이랑 달걀밖에 없는데 건강하게 먹는 법 있어?",
];

const LINK_PILLAR: Record<string, PillarId> = {
  [OFFICIAL_LINKS.jobs.href]: "job",
  [OFFICIAL_LINKS.training.href]: "edu",
  [OFFICIAL_LINKS.housing.href]: "housing",
  [OFFICIAL_LINKS.welfare.href]: "living",
};

/** 대화에서 나온 카드로 어떤 자립 영역을 다뤘는지 계산한다. */
function coveredPillars(bubbles: Bubble[]): Set<PillarId> {
  const s = new Set<PillarId>();
  for (const c of bubbles.flatMap((b) => b.cards)) {
    if (c.kind === "welfare" || c.kind === "localWelfare") {
      const p = KEYWORD_PILLAR[c.keyword];
      if (p) s.add(p);
    } else if (c.kind === "centers") s.add("job");
    else if (c.kind === "rent" || c.kind === "housing") s.add("housing");
    else if (c.kind === "youth") {
      const t = c.topic;
      s.add(t === "주거" ? "housing" : t === "일자리" ? "job" : t === "교육직업훈련" ? "edu" : "living");
    }
    else if (c.kind === "scenario") s.add("living");
    else if (c.kind === "links") c.links.forEach((l) => LINK_PILLAR[l.href] && s.add(LINK_PILLAR[l.href]));
  }
  return s;
}

function Avatar({ size = 36 }: { size?: number }) {
  return (
    <Image
      src={CHARACTER.avatar}
      alt={CHARACTER.name}
      width={size}
      height={size}
      // 카드가 길어져 줄 높이가 커져도 아바타가 늘어나지 않도록 위쪽에 고정하고 비율을 유지한다.
      style={{ width: size, height: size }}
      className="shrink-0 self-start rounded-full border border-hairline bg-white object-cover"
    />
  );
}

export function Chat() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const covered = useMemo(() => coveredPillars(bubbles), [bubbles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles]);

  const patchLast = (f: (b: Bubble) => Bubble) =>
    setBubbles((prev) => [...prev.slice(0, -1), f(prev[prev.length - 1])]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);

    const history: ChatTurn[] = [
      ...bubbles
        .filter((b) => b.text.trim() && !b.crisis && !b.error)
        .map((b): ChatTurn => ({ role: b.role, text: b.text.trim().slice(0, 2000) })),
      { role: "user" as const, text: q },
    ].slice(-24);

    setBubbles((prev) => [
      ...prev,
      { role: "user", text: q, cards: [] },
      { role: "assistant", text: "", cards: [], status: `${CHARACTER.name}이가 생각하는 중` },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: history }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as ChatEvent;
          if (e.type === "text") patchLast((b) => ({ ...b, text: b.text + e.delta, status: undefined }));
          else if (e.type === "tool") patchLast((b) => ({ ...b, status: e.label }));
          else if (e.type === "card") patchLast((b) => ({ ...b, cards: [...b.cards, e.card] }));
          else if (e.type === "crisis") patchLast((b) => ({ ...b, crisis: true, status: undefined }));
          else if (e.type === "error") patchLast((b) => ({ ...b, error: e.message, status: undefined }));
          else if (e.type === "done") patchLast((b) => ({ ...b, status: undefined, done: true }));
        }
      }
    } catch {
      patchLast((b) => ({ ...b, error: "연결이 끊겼어. 다시 보내 줄래?", status: undefined, done: true }));
    } finally {
      setBusy(false);
    }
  }

  const lastIdx = bubbles.length - 1;
  const nextPillars = PILLARS.filter((p) => !covered.has(p.id));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-hairline bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <Avatar size={40} />
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight">{CHARACTER.name}</p>
            <p className="text-xs text-muted">{CHARACTER.title} · 신청과 자격 확인은 공식 창구에서</p>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5" aria-label="자립 체크">
          {PILLARS.map((p) => {
            const on = covered.has(p.id);
            return (
              <span
                key={p.id}
                className={`flex-1 rounded-full px-2 py-1 text-center text-[11px] font-medium ${
                  on ? "bg-brand text-foreground" : "bg-surface text-muted"
                }`}
              >
                {on ? "✓ " : ""}
                {p.label}
              </span>
            );
          })}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-4">
        {bubbles.length === 0 && (
          <div className="flex flex-col items-center gap-4">
            <Image
              src={CHARACTER.full}
              alt={`${CHARACTER.name} 캐릭터`}
              width={640}
              height={950}
              priority
              className="h-56 w-auto object-contain"
            />
            <div className="flex w-full flex-col gap-2">
              {CHARACTER.greeting.map((g) => (
                <div key={g} className="flex items-end gap-2">
                  <Avatar size={28} />
                  <p className="rounded-2xl rounded-bl-md bg-brand-soft px-4 py-3 text-sm leading-relaxed">{g}</p>
                </div>
              ))}
            </div>
            <div className="flex w-full flex-col gap-2">
              <p className="text-xs text-muted">이렇게 말해 봐도 돼</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-2xl border border-hairline bg-white px-4 py-2 text-left text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="w-full">
              <PhoneList compact />
            </div>
          </div>
        )}

        {bubbles.map((b, i) =>
          b.role === "user" ? (
            <div key={i} className="ml-10 self-end rounded-2xl rounded-br-md bg-user px-4 py-2 text-sm text-white">
              {b.text}
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <Avatar size={32} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {b.crisis && <CrisisCard onClose={() => {}} />}
                {b.text.trim() && (
                  <div className="rounded-2xl rounded-tl-md bg-brand-soft px-4 py-3 text-sm leading-relaxed">
                    <RichText text={b.text.trim()} />
                  </div>
                )}
                {b.cards.map((c, j) => (
                  <ChatCard key={j} card={c} />
                ))}
                {b.status && <p className="animate-pulse text-xs text-muted">{b.status}…</p>}
                {b.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{b.error}</p>}
                {i === lastIdx && b.done && !b.crisis && !busy && nextPillars.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <p className="w-full text-xs text-muted">놓치면 아까운 것도 같이 볼까?</p>
                    {nextPillars.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => send(p.ask)}
                        className="rounded-full border border-hairline bg-white px-3 text-xs font-medium"
                      >
                        {p.label} 알아보기
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 flex gap-2 border-t border-hairline bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${CHARACTER.name}이에게 편하게 말해 줘`}
          maxLength={2000}
          className="min-h-11 flex-1 rounded-full border border-hairline bg-white px-4 text-base outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-user px-5 text-sm font-medium text-white disabled:opacity-40"
        >
          보내기
        </button>
      </form>
    </div>
  );
}
