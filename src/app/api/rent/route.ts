import type { NextRequest } from "next/server";
import { getRentStats } from "@/lib/publicapi/rent";
import { REGIONS } from "@/lib/regions";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const lawd = request.nextUrl.searchParams.get("lawd") ?? "";
  // 허용 목록에 있는 지역만 조회 (임의 값으로 외부 API를 호출하지 않도록)
  if (!REGIONS.some((r) => r.lawd === lawd)) {
    return Response.json({ error: "지원하지 않는 지역입니다." }, { status: 400 });
  }
  return Response.json(await getRentStats(lawd));
}
