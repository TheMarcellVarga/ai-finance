import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app-shell";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { redirectToSignIn, userId } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }
  return <AppShell>{children}</AppShell>;
}
