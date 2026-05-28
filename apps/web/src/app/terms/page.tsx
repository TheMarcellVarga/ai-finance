import { FileCheck2, LockKeyhole, Scale, TriangleAlert } from "lucide-react";

import { PublicInfoPage } from "@/components/public-info-page";

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms"
      title="Product terms will reinforce research support, not advice or execution."
      body="This surface is queued for the completion pass and must become concrete product terms before any public recruiter demo."
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
