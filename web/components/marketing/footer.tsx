import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold text-slate-900">CorpoRite</p>
          <p className="mt-1 text-sm text-slate-600">
            Hinglish to corporate English, everywhere you type.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-slate-600">
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            Sign in
          </Link>
          <Link href="/dashboard" className="hover:text-slate-900">
            Dashboard
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} CorpoRite
        </p>
      </div>
    </footer>
  );
}
