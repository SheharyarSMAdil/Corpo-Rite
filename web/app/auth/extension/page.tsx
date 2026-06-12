import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExtensionRedirect } from "@/components/auth/extension-redirect";
import { auth, signIn } from "@/lib/auth";
import { createExtensionToken } from "@/lib/extension-auth";

export default async function ExtensionAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_uri?: string }>;
}) {
  const { redirect_uri: redirectUri } = await searchParams;
  const session = await auth();

  if (!redirectUri) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-600">Missing redirect URI.</p>
      </div>
    );
  }

  if (!session?.user?.id) {
    const callbackUrl = `/auth/extension?redirect_uri=${encodeURIComponent(redirectUri)}`;
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">
            Connect CorpoRite extension
          </h1>
          <p className="mt-2 text-slate-600">
            Sign in with Google to link your extension and start using credits.
          </p>
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Continue with Google
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            <Link href="/" className="text-blue-600 hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const { rawToken } = await createExtensionToken(session.user.id);
  return <ExtensionRedirect redirectUri={redirectUri} token={rawToken} />;
}
