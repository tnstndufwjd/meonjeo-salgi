import type { NextRequest } from "next/server";
import { WELFARE_KEYWORDS } from "@/lib/keywords";
import { searchWelfare } from "@/lib/publicapi/welfare";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "자립";
  if (!(WELFARE_KEYWORDS as readonly string[]).includes(q)) {
    return Response.json({ error: "지원하지 않는 검색어입니다." }, { status: 400 });
  }
  return Response.json(await searchWelfare(q));
}
