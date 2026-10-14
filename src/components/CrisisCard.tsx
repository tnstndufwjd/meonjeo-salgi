import { CRISIS_MESSAGE } from "@/lib/crisis";

export function CrisisCard({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/30 bg-red-50 p-5"
    >
      <h2 className="text-lg font-bold">{CRISIS_MESSAGE.title}</h2>
      <p className="mt-2 text-sm leading-relaxed">{CRISIS_MESSAGE.body}</p>
      <div className="mt-4 flex flex-col gap-2">
        {CRISIS_MESSAGE.actions.map((a) => (
          <a
            key={a.tel}
            href={`tel:${a.tel}`}
            role="button"
            className="flex items-center justify-center rounded-full bg-foreground px-6 text-base font-medium text-background"
          >
            {a.label}
          </a>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-hairline bg-white px-6 text-sm"
        >
          담당 선생님께 연결 요청하기 (데모)
        </button>
      </div>
    </div>
  );
}
