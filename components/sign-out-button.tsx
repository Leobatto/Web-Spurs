"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button className={`flex items-center gap-2 text-sm text-zinc-400 ${compact ? "justify-center" : ""}`} onClick={signOut} type="button" title="Salir">
      <LogOut size={16} /> <span className={compact ? "lg:sr-only" : ""}>Salir</span>
    </button>
  );
}
