import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CREDIT_PACKS, FREE_MONTHLY_CREDITS } from "@/lib/constants";

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Simple, credit-based pricing
          </h2>
          <p className="mt-4 text-slate-600">
            1 credit = 1 rewrite. Start free, buy more when you need them.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card className="relative border-blue-200 ring-2 ring-blue-500/20">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-bg px-3 py-1 text-xs font-medium text-white">
              Free forever
            </span>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect to try CorpoRite</CardDescription>
            <p className="mt-6 text-4xl font-bold text-slate-900">$0</p>
            <p className="text-sm text-slate-500">per month</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                {FREE_MONTHLY_CREDITS} credits every month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                All formality levels
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                Works on any website
              </li>
            </ul>
            <Link href="/login" className="mt-8 block">
              <Button className="w-full">Get started</Button>
            </Link>
          </Card>

          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={
                "popular" in pack && pack.popular
                  ? "border-blue-200 ring-2 ring-blue-500/20"
                  : ""
              }
            >
              {"popular" in pack && pack.popular && (
                <span className="mb-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Best value
                </span>
              )}
              <CardTitle>{pack.label}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
              <p className="mt-6 text-4xl font-bold text-slate-900">
                ${pack.price}
              </p>
              <p className="text-sm text-slate-500">one-time purchase</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  {pack.credits.toLocaleString()} credits
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  Credits never expire
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  Stacks with free monthly credits
                </li>
              </ul>
              <Link href="/dashboard/billing" className="mt-8 block">
                <Button variant="secondary" className="w-full">
                  Buy credits
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
