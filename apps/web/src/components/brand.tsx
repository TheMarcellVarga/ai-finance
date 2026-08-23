import Link from "next/link";
import Image from "next/image";

export function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Aperture home">
      <span className="grid size-9 shrink-0 place-items-center transition-transform group-hover:scale-[1.03]">
        <Image
          src="/brand/aperture-mark.svg"
          alt=""
          aria-hidden="true"
          width={512}
          height={512}
          className="size-9 drop-shadow-[0_10px_24px_rgba(0,0,0,0.26)]"
          priority
        />
      </span>
      <span className="leading-none">
        <span className="block text-[0.98rem] font-medium tracking-[-0.02em] text-white">
          Aperture
        </span>
        <span className="mt-1 block text-[0.61rem] font-medium uppercase tracking-[0.13em] text-zinc-500">
          Financial Intelligence
        </span>
      </span>
    </Link>
  );
}
