import Image from "next/image";
import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Aperture home">
      <span className="relative size-10 shrink-0 overflow-hidden rounded-[0.95rem] bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_38px_rgba(0,0,0,0.24)] ring-1 ring-white/10">
        <Image
          src="/icon.png"
          alt=""
          fill
          priority
          sizes="40px"
          className="object-cover"
        />
      </span>
      <span className="leading-none">
        <span className="block text-sm font-light tracking-[-0.03em] text-white">
          Aperture
        </span>
        <span className="block text-[0.68rem] font-light uppercase tracking-[0.24em] text-zinc-500">
          Financial Intelligence
        </span>
      </span>
    </Link>
  );
}
