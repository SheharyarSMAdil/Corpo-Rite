"use client";

import { useEffect } from "react";

export function ExtensionRedirect({
  redirectUri,
  token,
}: {
  redirectUri: string;
  token: string;
}) {
  useEffect(() => {
    const target = new URL(redirectUri);
    target.hash = `token=${token}`;
    window.location.href = target.toString();
  }, [redirectUri, token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-slate-600">Connecting extension…</p>
    </div>
  );
}
