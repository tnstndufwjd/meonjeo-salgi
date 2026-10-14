import Image from "next/image";
import Link from "next/link";
import { PhoneList } from "@/components/PhoneList";
import { CHARACTER } from "@/lib/character";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col px-4 pb-8 pt-8">
      <p className="text-sm font-medium text-muted">먼저살기 · 데모 버전</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">
        혼자 시작하는 생활,
        <span className="block">{CHARACTER.name}이랑 같이 챙겨요</span>
      </h1>

      <Image
        src={CHARACTER.full}
        alt={`${CHARACTER.name} 캐릭터`}
        width={640}
        height={950}
        priority
        className="mx-auto mt-4 h-64 w-auto object-contain"
      />

      <p className="mt-4 rounded-2xl bg-brand-soft p-4 text-sm leading-relaxed">
        {CHARACTER.name}이는 {CHARACTER.title}예요. 생활비·주거·일자리·교육 중 받을 수 있는 지원을 대신 찾아 알려줘요.
        자격 판정과 신청은 공식 창구에서 해요. 대화 내용은 저장하지 않아요.
      </p>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Link
          href="/chat"
          role="button"
          className="flex items-center justify-center rounded-full bg-user px-6 text-base font-medium text-white"
        >
          {CHARACTER.name}이랑 이야기하기
        </Link>
        <Link
          href="/consult"
          role="button"
          className="flex items-center justify-center rounded-full border border-hairline px-6 text-base font-medium"
        >
          내 생활비 직접 계산해 보기
        </Link>
        <div className="pt-2">
          <PhoneList compact />
        </div>
      </div>
    </main>
  );
}
