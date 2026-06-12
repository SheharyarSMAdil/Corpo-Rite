import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Chrome extension · Credits included
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Write Hinglish.{" "}
              <span className="gradient-text">Send corporate English.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600">
              CorpoRite rewrites your Hinglish and informal Indian English into
              polished workplace English — in Gmail, Slack, LinkedIn, WhatsApp Web,
              and anywhere else you type.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login">
                <Button size="lg">Get started free</Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="secondary" size="lg">
                  See how it works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              50 free credits every month · No API key needed
            </p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-blue-500/10">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-slate-400">Slack — #general</span>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    You typed
                  </p>
                  <p className="mt-2 text-slate-700">
                    Kal meeting postpone karni padegi, client ko inform kar dena please.
                  </p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    CorpoRite suggests
                  </p>
                  <p className="mt-2 text-slate-800">
                    We will need to postpone tomorrow&apos;s meeting. Please inform the
                    client accordingly.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">
                Press Alt+Shift+C anywhere · Accept with one click
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
