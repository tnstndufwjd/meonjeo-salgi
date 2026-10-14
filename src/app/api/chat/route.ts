import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ChatEvent } from "@/lib/agent/cards";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { runTool, TOOL_LABELS, TOOLS } from "@/lib/agent/tools";
import { crisisCheck } from "@/lib/crisis";
import { checkChatLimit } from "@/lib/ratelimit";

// AI 응답은 도구 호출을 포함해 최대 1분 이상 걸릴 수 있다 (Vercel 함수 실행 시간 상한)
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const MAX_ITERATIONS = 6;

const Body = z.object({
  turns: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(2000) }))
    .min(1)
    .max(24),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const turns = parsed.data.turns;
  const last = turns[turns.length - 1];
  if (last.role !== "user") return Response.json({ error: "마지막 메시지는 사용자 메시지여야 합니다." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        // 위기 신호는 LLM보다 먼저, 규칙으로 처리한다. (요청 제한과 무관하게 항상 응답)
        if (crisisCheck(last.text).crisis) {
          emit({ type: "crisis" });
          return;
        }
        const limit = checkChatLimit(ip);
        if (!limit.ok) {
          emit({ type: "error", message: limit.reason });
          return;
        }
        await runAgent(turns, emit);
      } catch (err) {
        emit({ type: "error", message: errorMessage(err) });
      } finally {
        emit({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function runAgent(turns: z.infer<typeof Body>["turns"], emit: (e: ChatEvent) => void) {
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
  try {
    await runAgentLoop(turns, emit, usage);
  } finally {
    // 비용 점검용: 토큰 수만 기록한다 (사용자 입력·답변은 기록하지 않는다)
    console.log("chat-usage", JSON.stringify(usage));
  }
}

async function runAgentLoop(
  turns: z.infer<typeof Body>["turns"],
  emit: (e: ChatEvent) => void,
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number; calls: number },
) {
  const client = new Anthropic();
  // 이전 턴은 텍스트만 다시 보낸다. 이번 요청의 도구 루프 안에서는 응답 content를 그대로 덧붙인다(append-only).
  const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t) => ({ role: t.role, content: t.text }));
  // 한 번의 대화에서 도구를 여러 번 부르면 같은 앞부분(지시문·도구 정의·이전 대화)을 매번 다시 보내게 된다.
  // 자동 캐시(아래 cache_control)로 이 앞부분을 재사용해 입력 비용을 줄이고, 사용량은 runAgent가 로그 한 줄로 남긴다.

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
    stream.on("text", (delta) => emit({ type: "text", delta }));
    const message = await stream.finalMessage();
    usage.calls += 1;
    usage.input += message.usage.input_tokens ?? 0;
    usage.output += message.usage.output_tokens ?? 0;
    usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;

    if (message.stop_reason === "refusal") {
      emit({ type: "text", delta: "\n\n이 질문에는 답하기 어려워요. 다른 방식으로 물어봐 주시겠어요?" });
      return;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    if (message.stop_reason !== "tool_use" || toolUses.length === 0) return;

    messages.push({ role: "assistant", content: message.content });

    // 병렬 호출은 동시에 실행하고, 결과는 한 메시지에 모아 돌려준다.
    const outcomes = await Promise.all(
      toolUses.map(async (t) => {
        emit({ type: "tool", label: TOOL_LABELS[t.name] ?? "확인 중" });
        const outcome = await runTool(t.name, t.input);
        if (outcome.card) emit({ type: "card", card: outcome.card });
        return { t, outcome };
      }),
    );
    messages.push({
      role: "user",
      content: outcomes.map(({ t, outcome }) => ({
        type: "tool_result" as const,
        tool_use_id: t.id,
        content: outcome.content,
        is_error: outcome.isError,
      })),
    });
    emit({ type: "text", delta: "\n\n" });
  }
  emit({ type: "text", delta: "\n\n(확인할 것이 많아 여기서 멈췄어요. 이어서 물어봐 주세요.)" });
}

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "AI 연결 설정(API 키)이 필요해요. 관리자에게 알려주세요.";
  if (err instanceof Anthropic.RateLimitError) return "지금 요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (err instanceof Anthropic.APIError) return `AI 서버 오류가 났어요 (${err.status ?? "연결"}). 잠시 후 다시 시도해 주세요.`;
  if (err instanceof Error && /api key|apiKey|ANTHROPIC/i.test(err.message)) {
    return "AI 연결 설정(API 키)이 필요해요. 관리자에게 알려주세요.";
  }
  return "답변 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}
