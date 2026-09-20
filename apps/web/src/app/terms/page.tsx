import type { Metadata } from "next";
import { FileCheck2, LockKeyhole, Scale, TriangleAlert } from "lucide-react";

import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Research-support terms for Aperture's portfolio intelligence workspace.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms"
      title="Research-support terms for portfolio intelligence."
      body="Aperture is a financial research and portfolio decision-support workspace. It helps organize source-backed context, explain risk factors, and compare scenarios; it is not a brokerage, robo-advisor, automated trading system, or suitability engine."
      items={[
        {
          title: "Research-only use",
          body: "Use the workspace for source review, portfolio context, goal scenario planning, watchlist monitoring, and risk explanation.",
          icon: FileCheck2,
        },
        {
          title: "No execution",
          body: "The product does not place orders, connect to brokerage execution, or automate trading workflows.",
          icon: LockKeyhole,
        },
        {
          title: "No advice promise",
          body: "AI outputs are decision-support material only and do not promise suitability, returns, outcomes, or personal investment advice.",
          icon: Scale,
        },
        {
          title: "Freshness limits",
          body: "Market data, filings, and AI-generated context must be read with their assumptions, source citations, and freshness labels.",
          icon: TriangleAlert,
        },
      ]}
    />
  );
}
