import { FileCheck2, LockKeyhole, Scale, TriangleAlert } from "lucide-react";

import { PublicSkeletonPage } from "@/components/public-skeleton-page";

export default function TermsPage() {
  return (
    <PublicSkeletonPage
      eyebrow="Terms"
      title="Product terms will reinforce research support, not advice or execution."
      body="This scaffold reserves the legal terms surface for boundaries around AI outputs, data freshness, usage limits, and financial decision-support disclaimers."
      items={[
        {
          title: "Research-only use",
          body: "Aperture supports portfolio research, source review, scenario planning, and risk explanation.",
          icon: FileCheck2,
        },
        {
          title: "No execution",
          body: "The product does not place orders, connect to brokerage execution, or automate trading workflows.",
          icon: LockKeyhole,
        },
        {
          title: "No advice promise",
          body: "AI outputs must remain decision-support material and cannot promise suitability, returns, or outcomes.",
          icon: Scale,
        },
        {
          title: "Freshness limits",
          body: "Market data, filings, and AI-generated context must disclose assumptions and stale-data limitations.",
          icon: TriangleAlert,
        },
      ]}
    />
  );
}
