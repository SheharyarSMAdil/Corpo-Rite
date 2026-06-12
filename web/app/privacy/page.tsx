import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mesh-bg min-h-screen px-4 py-12 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          CorpoRite Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: June 2026</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p>
              CorpoRite is a Chrome extension that rewrites Hinglish and informal
              Indian English into professional corporate English. This policy covers
              the extension and the CorpoRite website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              What we collect
            </h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Google account info</strong> — name, email, and profile
                picture when you sign in.
              </li>
              <li>
                <strong>Text you submit for rewriting</strong> — sent to our servers
                only when you request a suggestion.
              </li>
              <li>
                <strong>Usage data</strong> — credit balance and rewrite counts for
                billing and account management.
              </li>
              <li>
                <strong>Extension settings</strong> — formality, tone, and site
                preferences stored in Chrome sync storage on your device.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              How we use your data
            </h2>
            <p>
              Text you submit is processed by our servers using OpenAI to generate
              rewrite suggestions. We do not sell your data. Payment processing is
              handled by Stripe; we do not store card details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">What we do not do</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>We do not require or store OpenAI API keys.</li>
              <li>We do not run third-party analytics trackers.</li>
              <li>We do not read text unless you trigger a rewrite.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p>
              Questions about privacy? Contact us through the CorpoRite website
              dashboard.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
