const faqs = [
  {
    q: "What is Hinglish?",
    a: "Hinglish is Hindi written in Roman/Latin script, often mixed with English — common in Indian workplaces. CorpoRite converts it into polished corporate English while keeping your meaning.",
  },
  {
    q: "Do I need an OpenAI API key?",
    a: "No. Sign in with Google and use your CorpoRite credits. We handle the AI on our servers.",
  },
  {
    q: "What data is sent to CorpoRite?",
    a: "Only the text you ask to rewrite is sent to our servers when you trigger a suggestion. We use it to generate a rewrite and do not sell your data.",
  },
  {
    q: "Which websites are supported?",
    a: "Any site with a text field — Gmail, LinkedIn, Slack, Notion, WhatsApp Web, and more. You can optionally restrict CorpoRite to specific sites.",
  },
  {
    q: "How do credits work?",
    a: "Each rewrite costs 1 credit (including extend, shorten, and regenerate). You get 50 free credits every month. Buy more anytime from your dashboard.",
  },
  {
    q: "Can I use a keyboard shortcut?",
    a: "Yes. Press Alt+Shift+C (customizable at chrome://extensions/shortcuts) to open a suggestion without auto-suggest enabled.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <dl className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <dt className="font-semibold text-slate-900">{faq.q}</dt>
              <dd className="mt-2 text-slate-600">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
