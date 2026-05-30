import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="page-stage grid min-h-dvh place-items-center px-4 py-12">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </main>
  );
}
