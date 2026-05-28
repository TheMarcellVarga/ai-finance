import { BookOpenCheck, FileText, Gauge, ShieldCheck } from "lucide-react";

import { PublicInfoPage } from "@/components/public-info-page";

export default function BlogPage() {
  return (
    <PublicInfoPage
      eyebrow="Briefs"
      title="Research notes will document product, AI, and finance safety decisions."
      body="This surface is queued for the completion pass so the public site can show real case-study writing instead of reserved publishing content."
      items={[
        {
          title: "Architecture notes",
          body: "The first article should explain why Next.js owns product rendering while Go owns authoritative finance APIs.",
          icon: Gauge,
        },
        {
          title: "AI safety logs",
          body: "The AI safety article should cover schema validation, citations, freshness labels, and advice-boundary evals.",
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
