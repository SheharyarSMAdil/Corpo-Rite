import { BuyCreditsButton } from "@/components/dashboard/buy-credits-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CREDIT_PACKS, FREE_MONTHLY_CREDITS } from "@/lib/constants";
import { getCreditBalance } from "@/lib/credits";
import { auth } from "@/lib/auth";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  const { balance } = await getCreditBalance(session!.user!.id);
  const { success, canceled } = await searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
        <p className="mt-2 text-slate-600">
          Buy credit packs or use your {FREE_MONTHLY_CREDITS} free monthly credits.
        </p>
      </div>

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          Payment successful! Credits have been added to your account.
        </div>
      )}
      {canceled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          Checkout was canceled.
        </div>
      )}

      <Card>
        <CardTitle>Current balance</CardTitle>
        <p className="mt-4 text-4xl font-bold text-slate-900">{balance} credits</p>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        {CREDIT_PACKS.map((pack) => (
          <Card key={pack.id}>
            <CardTitle>{pack.label}</CardTitle>
            <CardDescription>{pack.description}</CardDescription>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              ${pack.price}
            </p>
            <p className="text-sm text-slate-500">
              {pack.credits.toLocaleString()} credits
            </p>
            <div className="mt-6">
              <BuyCreditsButton
                packId={pack.id}
                label={`Buy ${pack.credits.toLocaleString()} credits`}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
