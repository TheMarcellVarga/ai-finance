import type { Metadata } from "next";
import { DatabaseZap, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";

import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Aperture's privacy posture for sensitive portfolio and AI research data.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="Privacy posture for sensitive portfolio and AI research data."
      body="Aperture treats identity, holdings, prompts, AI outputs, billing records, and usage events as sensitive product data. The app is designed around server-side access controls, ownership checks, minimized telemetry, and explicit source freshness."
      items={[
        {
          title: "Sensitive data",
          body: "Portfolio holdings, watchlists, saved research, AI brief metadata, billing state, and account identity are scoped to the authenticated user and should never be exposed across tenants.",
          icon: Fingerprint,
        },
        {
          title: "Server-only secrets",
          body: "Provider keys, Supabase service-role credentials, webhook secrets, model configuration, and raw JWTs stay in server runtimes and are not shipped to browser bundles.",
          icon: KeyRound,
        },
        {
          title: "Tool boundaries",
          body: "AI tools call owner-scoped application APIs and typed server wrappers; models do not receive unrestricted database credentials or arbitrary tenant access.",
          icon: DatabaseZap,
        },
        {
          title: "Scrubbed telemetry",
          body: "Observability helpers scrub PII, holdings, financial amounts, raw prompts, AI outputs, API keys, and webhook secrets before analytics or error reporting.",
          icon: ShieldCheck,
        },
      ]}
    />
  );
}
