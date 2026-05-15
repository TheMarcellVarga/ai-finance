import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Aperture home">
      <span className="grid size-10 place-items-center rounded-2xl bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_38px_rgba(0,0,0,0.24)]">
        <span className="relative size-5 rounded-full bg-cyan-200/12 shadow-[inset_0_0_0_1px_rgba(165,243,252,0.58),0_0_22px_rgba(103,232,249,0.08)]">
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-200/60" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-200/60" />
        </span>
      </span>
      <span className="leading-none">
        <span className="block text-sm font-semibold tracking-tight text-white">
          Aperture
        </span>
        <span className="block text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">
          Financial Intelligence
        </span>
      </span>
    </Link>
  );
}
