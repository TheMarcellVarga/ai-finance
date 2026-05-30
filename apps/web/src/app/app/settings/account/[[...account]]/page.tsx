import { UserProfile } from "@clerk/nextjs";

export default function AccountSettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="type-label text-xs uppercase text-cyan-100">Account management</p>
        <h1 className="type-display mt-4 text-3xl text-white sm:text-5xl">Profile and sign-in security</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
          Manage your identity, active sessions, connected accounts, and sign-in security through Clerk.
        </p>
      </div>
      <UserProfile path="/app/settings/account" routing="path" />
    </section>
  );
}
