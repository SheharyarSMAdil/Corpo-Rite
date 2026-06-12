import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  getCreditBalance,
  getRecentTransactions,
  getUsageLast30Days,
} from "@/lib/credits";
import { FREE_MONTHLY_CREDITS } from "@/lib/constants";

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function reasonLabel(reason: string) {
  switch (reason) {
    case "rewrite":
      return "Rewrite";
    case "monthly_grant":
      return "Monthly free credits";
    case "purchase":
      return "Credit purchase";
    default:
      return reason;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const { balance, freeResetAt } = await getCreditBalance(userId);
  const transactions = await getRecentTransactions(userId, 15);
  const usage = await getUsageLast30Days(userId);
  const totalRewrites30d = usage.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welcome back, {session?.user?.name ?? "there"}.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardTitle>Credits remaining</CardTitle>
          <p className="mt-4 text-4xl font-bold text-slate-900">{balance}</p>
          <CardDescription className="mt-2">
            Next free grant ({FREE_MONTHLY_CREDITS} credits):{" "}
            {formatDate(freeResetAt)}
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Rewrites (30 days)</CardTitle>
          <p className="mt-4 text-4xl font-bold text-slate-900">
            {totalRewrites30d}
          </p>
          <CardDescription className="mt-2">
            1 credit per rewrite, extend, shorten, or regenerate.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Extension</CardTitle>
          <CardDescription className="mt-4">
            Open the CorpoRite popup in Chrome and click{" "}
            <strong>Sign in with Google</strong> to connect your account.
          </CardDescription>
        </Card>
      </div>

      <Card>
        <CardTitle>Recent activity</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 font-medium text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-slate-500">
                    No activity yet. Use the extension to get started.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-700">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {reasonLabel(tx.reason)}
                    </td>
                    <td
                      className={`py-3 text-right font-medium ${
                        tx.delta >= 0 ? "text-green-600" : "text-slate-700"
                      }`}
                    >
                      {tx.delta >= 0 ? "+" : ""}
                      {tx.delta}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
