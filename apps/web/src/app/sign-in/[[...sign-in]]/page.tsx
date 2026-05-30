import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="page-stage grid min-h-dvh place-items-center px-4 py-12">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </main>
  );
}
