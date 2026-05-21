import { DatabaseZap, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";

import { PublicSkeletonPage } from "@/components/public-skeleton-page";

export default function PrivacyPage() {
  return (
    <PublicSkeletonPage
      eyebrow="Privacy"
      title="Privacy posture for sensitive portfolio and AI research data."
      body="This scaffold marks the public privacy surface before implementation of Clerk, Supabase, analytics scrubbing, and audit-backed data flows."
      items={[
        {
          title: "Sensitive data",
          body: "Portfolio holdings, prompts, AI outputs, billing data, and identity metadata are treated as protected product data.",
          icon: Fingerprint,
        },
        {
          title: "Server-only secrets",
          body: "Provider keys, service-role credentials, webhook secrets, and private prompts must never ship to browser bundles.",
          icon: KeyRound,
        },
        {
          title: "Tool boundaries",
          body: "AI tools will call application-owned APIs instead of unrestricted database access or raw credentials.",
          icon: DatabaseZap,
        },
        {
          title: "Scrubbed telemetry",
          body: "Analytics and error reporting must avoid PII, holdings, raw prompts, AI outputs, and financial amounts by default.",
          icon: ShieldCheck,
        },
      ]}
    />
  );
}
