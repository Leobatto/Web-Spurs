import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  ["Dashboard", "/dashboard"],
  ["Fixture", "/fixture"],
  ["Plantel", "/roster"],
  ["Importar", "/import"],
  ["Jugadas", "/jugadas"],
  ["Reportes", "/reports"],
  ["Mi cuenta", "/account"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f1ec] text-zinc-950">
      <aside className="border-b border-zinc-200 bg-zinc-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0">
        <div className="flex h-full flex-col p-6">
          <Link href="/dashboard" className="text-2xl font-black tracking-tight">
            JP Spurs
          </Link>
          <p className="mt-2 text-sm text-zinc-400">Stats, reportes y planillas.</p>
          <nav className="mt-8 grid gap-2">
            {links.map(([label, href]) => (
              <Link
                className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
