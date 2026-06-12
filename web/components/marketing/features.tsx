import {
  Globe,
  Keyboard,
  Layers,
  MessageSquare,
  Shield,
  Sparkles,
} from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Globe,
    title: "Works everywhere",
    description:
      "Gmail, LinkedIn, Slack, Notion, WhatsApp Web — any input, textarea, or contenteditable field.",
  },
  {
    icon: Keyboard,
    title: "Alt+Shift+C shortcut",
    description:
      "Trigger suggestions on demand to save credits. Optional auto-suggest while typing.",
  },
  {
    icon: Layers,
    title: "Formality levels",
    description:
      "Casual professional, standard corporate, formal client-facing, or executive tone.",
  },
  {
    icon: MessageSquare,
    title: "Keep your voice",
    description:
      "Toggle tone preservation to fix grammar while keeping your personality and warmth.",
  },
  {
    icon: Sparkles,
    title: "Selection rewrite",
    description:
      "Highlight text to rewrite only what you need. Extend or shorten suggestions in one click.",
  },
  {
    icon: Shield,
    title: "Site allowlist",
    description:
      "Restrict CorpoRite to specific websites when you want tighter control.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Everything you need to sound professional
          </h2>
          <p className="mt-4 text-slate-600">
            Built for Indian professionals who think in Hinglish but need to write in
            polished English.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <feature.icon className="h-8 w-8 text-blue-600" />
              <CardTitle className="mt-4">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
