export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Install the extension",
      description:
        "Add CorpoRite from the Chrome Web Store (or load unpacked in developer mode).",
    },
    {
      step: "02",
      title: "Sign in with Google",
      description:
        "Connect your account in the extension or on this site. We give you 50 free credits monthly.",
    },
    {
      step: "03",
      title: "Press Alt+Shift+C",
      description:
        "Type in Hinglish anywhere, trigger a suggestion, and accept with one click.",
    },
  ];

  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-slate-600">Up and running in under a minute.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative rounded-2xl border border-slate-200 bg-white p-8">
              <span className="text-4xl font-bold gradient-text">{item.step}</span>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
