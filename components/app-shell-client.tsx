"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  CircleUserRound,
  Camera,
  FileUp,
  Film,
  Home,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PlaySquare,
  ShieldUser,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type ShellLink = {
  label: string;
  href: string;
};

const navMeta: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }> = {
  Dashboard: { icon: LayoutDashboard, tone: "text-white" },
  Torneos: { icon: Trophy, tone: "text-zinc-200" },
  Multimedia: { icon: Film, tone: "text-zinc-300" },
  Instagram: { icon: Camera, tone: "text-zinc-100" },
  Fixture: { icon: CalendarDays, tone: "text-zinc-400" },
  Partidos: { icon: PlaySquare, tone: "text-zinc-200" },
  Plantel: { icon: Users, tone: "text-zinc-300" },
  Importar: { icon: FileUp, tone: "text-zinc-100" },
  Jugadas: { icon: Swords, tone: "text-zinc-400" },
  Estadísticas: { icon: ChartColumn, tone: "text-zinc-200" },
  "Mi perfil": { icon: CircleUserRound, tone: "text-zinc-300" },
  Usuarios: { icon: ShieldUser, tone: "text-zinc-100" },
};

export function AppShellClient({
  children,
  links,
}: {
  children: React.ReactNode;
  links: ShellLink[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-zinc-950 text-white lg:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
            <Link href="/dashboard" className="flex items-center gap-3 text-lg font-black tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
              <Image alt="JP Spurs" src="/logo-spurs.png" width={32} height={32} className="rounded-full bg-white/5 p-1" />
              <span>JP Spurs</span>
            </Link>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 transition group-open:bg-white group-open:text-zinc-950">
              Menu
            </span>
          </summary>
          <div className="border-t border-white/10 px-5 py-4">
            <p className="text-sm text-zinc-400">Stats, reportes, partidos, usuarios, Instagram y pizarra.</p>
            <nav className="mt-4 grid gap-2">
              {links.map(({ label, href }) => {
                const MetaIcon = navMeta[label]?.icon ?? Home;

                return (
                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  href={href}
                  key={href}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 ${navMeta[label]?.tone ?? "text-white"}`}>
                    <MetaIcon size={16} />
                  </span>
                  {label}
                </Link>
                );
              })}
            </nav>
            <div className="mt-4 pb-1">
              <SignOutButton />
            </div>
          </div>
        </details>
      </header>

      <aside className={`hidden border-b border-zinc-200 bg-zinc-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:border-b-0 lg:transition-all lg:duration-300 ${collapsed ? "lg:w-20" : "lg:w-72"}`}>
        <div className="flex h-full flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 text-2xl font-black tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
              <Image alt="JP Spurs" src="/logo-spurs.png" width={38} height={38} className="rounded-full bg-white/5 p-1" />
              <span className={collapsed ? "lg:sr-only" : ""}>JP Spurs</span>
            </Link>
            <button
              aria-label={collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-100 transition hover:bg-white/10"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
            <p className={`mt-2 text-sm text-zinc-400 transition ${collapsed ? "lg:sr-only" : ""}`}>Stats, reportes, partidos, usuarios, Instagram y pizarra.</p>
            <nav className="mt-8 grid gap-2">
              {links.map(({ label, href }) => {
                const MetaIcon = navMeta[label]?.icon ?? Home;

                return (
                <Link
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${collapsed ? "lg:justify-center" : ""}`}
                  href={href}
                  key={href}
                  title={label}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 ${navMeta[label]?.tone ?? "text-white"}`}>
                    <MetaIcon size={16} />
                  </span>
                  <span className={collapsed ? "lg:sr-only" : ""}>{label}</span>
                </Link>
                );
              })}
            </nav>
          <div className="mt-auto pt-8">
            <SignOutButton compact={collapsed} />
          </div>
        </div>
      </aside>
      <main className={collapsed ? "lg:pl-20" : "lg:pl-72"}>
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
