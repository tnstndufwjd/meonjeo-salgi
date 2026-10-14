/** 원 → "120만원", "-2만원" 처럼 만원 단위로 표시 */
export function manwon(won: number): string {
  const v = Math.round(won / 10_000);
  return `${v.toLocaleString("ko-KR")}만원`;
}
