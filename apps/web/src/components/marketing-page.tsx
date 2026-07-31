import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
