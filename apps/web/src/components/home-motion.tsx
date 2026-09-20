"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HomeMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const context = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".home-hero-art", { opacity: 0, scale: 1.06, duration: 1.4 })
        .from(
          ".home-hero-copy > *",
          { opacity: 0, y: 24, filter: "blur(10px)", duration: 0.9, stagger: 0.08 },
          0.12,
        );

      gsap.utils.toArray<HTMLElement>("[data-home-reveal]").forEach((section) => {
        gsap.from(section, {
          opacity: 0,
          y: 40,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        });
      });

      const story = root.querySelector<HTMLElement>("[data-story]");
      const visual = root.querySelector<HTMLElement>("[data-story-visual]");
      const progress = root.querySelector<HTMLElement>("[data-story-progress]");

      if (story && visual && window.matchMedia("(min-width: 900px)").matches) {
        ScrollTrigger.create({
          trigger: story,
          start: "top top",
          end: "bottom bottom",
          pin: visual,
          pinSpacing: false,
        });

        if (progress) {
          gsap.fromTo(
            progress,
            { scaleY: 0, transformOrigin: "top center" },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: story,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
              },
            },
          );
        }

        gsap.utils.toArray<HTMLElement>("[data-story-panel]").forEach((panel) => {
          gsap.fromTo(
            panel,
            { opacity: 0.32, y: 28 },
            {
              opacity: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: panel,
                start: "top 72%",
                end: "top 42%",
                scrub: true,
              },
            },
          );
        });
      }
    }, root);

    return () => context.revert();
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
