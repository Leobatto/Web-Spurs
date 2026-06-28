"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LinkGoogleAccountButton({
  calendarAccess,
  label = "Vincular Google",
}: {
  calendarAccess?: boolean;
  label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function linkGoogle() {
    setPending(true);
    setError(null);

    const result = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/account",
      errorCallbackURL: "/account?google=error",
      scopes: calendarAccess
        ? [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar.events",
          ]
        : undefined,
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "No pudimos vincular Google.");
    }
  }

  return (
    <div>
      <button
        className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        disabled={pending}
        onClick={linkGoogle}
        type="button"
      >
        {pending ? "Abriendo Google..." : label}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
