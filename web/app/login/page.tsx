import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl ?? "/dashboard");
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl gradient-bg text-lg font-bold text-white">
            C
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Sign in to CorpoRite
          </h1>
          <p className="mt-2 text-slate-600">
            Use your Google account to get 50 free credits every month.
          </p>
        </div>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: callbackUrl ?? "/dashboard",
            });
          }}
        >
          <Button type="submit" className="w-full" size="lg">
            Continue with Google
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
