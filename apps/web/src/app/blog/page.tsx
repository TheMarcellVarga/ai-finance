import { BookOpenCheck, FileText, Gauge, ShieldCheck } from "lucide-react";

import { PublicInfoPage } from "@/components/public-info-page";

export default function BlogPage() {
  return (
    <PublicInfoPage
      eyebrow="Briefs"
      title="Case-study notes on architecture, AI safety, and finance boundaries."
      body="Aperture publishes implementation notes that explain how the product separates research support from trading, keeps user-owned finance data behind server boundaries, and verifies AI output with deterministic evals."
      items={[
        {
          title: "Architecture boundary",
          body: "Next.js owns product rendering, authenticated UX, and AI route handlers while Go owns authoritative finance APIs, portfolio math, provider normalization, and audit-backed mutations.",
          icon: Gauge,
        },
        {
          title: "AI safety log",
          body: "Portfolio briefs, filing summaries, goal plans, and risk explanations are schema-checked for citations, freshness labels, refusal behavior, and advice-boundary language.",
          icon: ShieldCheck,
        },
        {
          title: "Research workflow",
          body: "The research room combines filing chunks, watchlist context, saved citations, assumptions, and source timestamps so outputs can be reviewed instead of blindly trusted.",
          icon: FileText,
        },
        {
          title: "Portfolio evidence",
          body: "The case-study material focuses on real data flow, disabled-by-default external model spend, server-enforced entitlements, signed webhooks, and polished responsive surfaces.",
          icon: BookOpenCheck,
        },
      ]}
    />
  );
}
