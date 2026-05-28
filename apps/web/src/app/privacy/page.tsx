import { DatabaseZap, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";

import { PublicInfoPage } from "@/components/public-info-page";

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="Privacy posture for sensitive portfolio and AI research data."
      body="This surface is queued for the completion pass and must become a concrete privacy policy before any public recruiter demo."
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
