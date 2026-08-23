import Link from "next/link";

type ApertureGlyphProps = {
  className?: string;
};

export function ApertureGlyph({ className }: ApertureGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="27" fill="currentColor" />
      <g clipPath="url(#aperture-glyph-clip)">
        <path d="M29.8 4H35.4V23.8H30.2Z" className="fill-zinc-950" />
        <path d="M44.4 35.6L64 40.8V46.6L41.8 40.8Z" className="fill-zinc-950" />
        <path d="M22.2 37.6L7.2 55.6L3.2 51.6L18.8 33Z" className="fill-zinc-950" />
        <path d="M32 20.8L45.8 43L19 43.8Z" className="fill-zinc-950" />
        <circle cx="32" cy="34.4" r="3" fill="#D8F28A" />
      </g>
      <defs>
        <clipPath id="aperture-glyph-clip">
          <circle cx="32" cy="32" r="27" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Aperture home">
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.72rem] border border-white/10 bg-zinc-950/90 text-[#f4f4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_36px_rgba(0,0,0,0.24)] transition-colors group-hover:text-white">
        <ApertureGlyph className="size-[1.65rem]" />
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
