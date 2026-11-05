"use client";

import Image from "next/image";
import { useState } from "react";

export function HomeHeroImage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      src="/media/aperture-private-study-hero-v2.webp"
      alt=""
      fill
      priority
      sizes="100vw"
      className={`home-hero-art${loaded ? " is-loaded" : ""}`}
      onLoad={() => setLoaded(true)}
    />
  );
}
