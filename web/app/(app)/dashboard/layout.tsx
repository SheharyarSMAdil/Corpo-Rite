import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="mesh-bg min-h-screen">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-slate-900">
              CorpoRite
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/dashboard" className="hover:text-slate-900">
                Overview
              </Link>
              <Link href="/dashboard/billing" className="hover:text-slate-900">
                Billing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
