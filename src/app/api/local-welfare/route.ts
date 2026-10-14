import type { NextRequest } from "next/server";
import { LOCAL_KEYWORDS } from "@/lib/keywords";
import { searchLocalWelfare } from "@/lib/publicapi/localWelfare";
import { regionOf } from "@/lib/regions";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const region = regionOf(request.nextUrl.searchParams.get("region") ?? "");
  const q = request.nextUrl.searchParams.get("q") ?? "청년";
  if (!region || !(LOCAL_KEYWORDS as readonly string[]).includes(q)) {
    return Response.json({ error: "지원하지 않는 지역 또는 검색어입니다." }, { status: 400 });
  }
  return Response.json(await searchLocalWelfare(region, q));
}
