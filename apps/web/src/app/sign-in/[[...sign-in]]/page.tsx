import { SignIn } from "@clerk/nextjs";

import { clerkUnavailableMessage, hasClerkPublishableKey } from "@/lib/clerk-config";

export default function SignInPage() {
  if (!hasClerkPublishableKey()) {
    return (
      <main className="page-stage grid min-h-dvh place-items-center px-4 py-12 text-center">
        <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 text-white shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Configuration required</p>
          <h1 className="mt-3 text-2xl font-semibold">Sign-in is unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">{clerkUnavailableMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-stage grid min-h-dvh place-items-center px-4 py-12">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </main>
  );
}
