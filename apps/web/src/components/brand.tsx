import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Aperture home">
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] border border-white/10 bg-zinc-950/80 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.2)]">
        <svg
          aria-hidden="true"
          className="size-6"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.8 24.5L16 6.8L24.2 24.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 17.4C12.9 15.9 14.4 15.2 16 15.2C17.6 15.2 19.1 15.9 20.5 17.4"
            stroke="#A7F3D0"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <circle cx="16" cy="17.4" r="1.35" fill="#D9F99D" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-medium tracking-normal text-white">
          Aperture
        </span>
        <span className="block text-[0.68rem] font-normal tracking-normal text-zinc-500">
          Financial Intelligence
        </span>
      </span>
    </Link>
  );
}
