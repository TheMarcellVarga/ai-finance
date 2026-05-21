import { BookOpenCheck, FileText, Gauge, ShieldCheck } from "lucide-react";

import { PublicSkeletonPage } from "@/components/public-skeleton-page";

export default function BlogPage() {
  return (
    <PublicSkeletonPage
      eyebrow="Briefs"
      title="Research notes will document product, AI, and finance safety decisions."
      body="This scaffold reserves the public writing surface for cited product updates, architecture notes, and implementation case-study material."
      items={[
        {
          title: "Architecture notes",
          body: "Planned posts will explain why Next.js owns product rendering while Go owns authoritative finance APIs.",
          icon: Gauge,
        },
        {
          title: "AI safety logs",
          body: "Future notes will cover schema validation, citations, freshness labels, and advice-boundary evals.",
          icon: ShieldCheck,
        },
        {
          title: "Research workflow",
          body: "Briefs will show how filings, portfolio context, and saved research artifacts support decision review.",
          icon: FileText,
        },
        {
          title: "Case study material",
          body: "Recruiter-facing writeups will focus on product tradeoffs, secure boundaries, and polished implementation evidence.",
          icon: BookOpenCheck,
        },
      ]}
    />
  );
}
