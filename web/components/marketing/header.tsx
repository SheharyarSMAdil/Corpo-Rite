import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg text-sm text-white">
            C
          </span>
          CorpoRite
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <Link href="#features" className="hover:text-slate-900">
            Features
          </Link>
          <Link href="#how-it-works" className="hover:text-slate-900">
            How it works
          </Link>
          <Link href="#pricing" className="hover:text-slate-900">
            Pricing
          </Link>
          <Link href="#faq" className="hover:text-slate-900">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
