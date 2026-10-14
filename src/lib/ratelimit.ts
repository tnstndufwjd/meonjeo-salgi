import "server-only";

/**
 * 간단한 요청 제한 (서버 인스턴스 메모리 기준). 공개 데모 URL에서 Claude 크레딧이
 * 소진되는 것을 막는 1차 장치다. 서버리스에서는 인스턴스마다 따로 세므로 완전하진 않다.
 * 실제 한도는 Claude Console의 월 지출 한도로 반드시 함께 건다.
 */
const PER_IP_LIMIT = Number(process.env.CHAT_PER_IP_PER_HOUR ?? 20);
const GLOBAL_DAILY_LIMIT = Number(process.env.CHAT_GLOBAL_PER_DAY ?? 400);

const hourly = new Map<string, { count: number; resetAt: number }>();
let daily = { count: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 };

export type LimitResult = { ok: true } | { ok: false; reason: string };

export function checkChatLimit(ip: string): LimitResult {
  const now = Date.now();

  if (now > daily.resetAt) daily = { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
  if (daily.count >= GLOBAL_DAILY_LIMIT) {
    return { ok: false, reason: "오늘은 상담 가능한 횟수를 모두 썼어. 내일 다시 이야기하자!" };
  }

  const cur = hourly.get(ip);
  if (!cur || now > cur.resetAt) {
    hourly.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
  } else {
    if (cur.count >= PER_IP_LIMIT) {
      return { ok: false, reason: "한 시간에 보낼 수 있는 메시지를 다 썼어. 조금 있다가 다시 말해 줘!" };
    }
    cur.count += 1;
  }
  daily.count += 1;

  // 맵이 무한히 커지지 않도록 가끔 만료 항목을 정리한다.
  if (hourly.size > 5000) {
    for (const [k, v] of hourly) if (now > v.resetAt) hourly.delete(k);
  }
  return { ok: true };
}
