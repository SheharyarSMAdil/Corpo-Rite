"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BuyCreditsButton({
  packId,
  label,
}: {
  packId: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Checkout failed");
      }
    } catch {
      alert("Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleBuy} disabled={loading} variant="secondary">
      {loading ? "Loading…" : label}
    </Button>
  );
}
