import { getCurrentUser } from "@/lib/auth";
import { AppShellClient } from "@/components/app-shell-client";

type ShellLink = {
  label: string;
  href: string;
};

const baseLinks: ShellLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Torneos", href: "/torneo" },
  { label: "Multimedia", href: "/multimedia" },
  { label: "Instagram", href: "/instagram" },
  { label: "Fixture", href: "/fixture" },
  { label: "Partidos", href: "/partidos" },
  { label: "Plantel", href: "/roster" },
  { label: "Importar", href: "/import" },
  { label: "Jugadas", href: "/jugadas" },
  { label: "Estadísticas", href: "/reports" },
  { label: "Mi perfil", href: "/account" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const links: ShellLink[] =
    currentUser?.role === "admin"
      ? [...baseLinks, { label: "Usuarios", href: "/users" }]
      : baseLinks;

  return <AppShellClient links={links}>{children}</AppShellClient>;
}
