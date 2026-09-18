import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app-shell";
import { clerkUnavailableMessage, hasClerkRuntimeKeys } from "@/lib/clerk-config";
import { EducationStateProvider } from "@/lib/education-state";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  if (!hasClerkRuntimeKeys()) {
    return (
      <main id="main-content" tabIndex={-1} className="page-stage grid min-h-dvh place-items-center px-4 py-12 text-center">
        <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 text-white shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Configuration required</p>
          <h1 className="mt-3 text-2xl font-semibold">Workspace sign-in is unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">{clerkUnavailableMessage}</p>
        </div>
      </main>
    );
  }

  const { redirectToSignIn, userId } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }
  return <EducationStateProvider userId={userId}><AppShell>{children}</AppShell></EducationStateProvider>;
}
