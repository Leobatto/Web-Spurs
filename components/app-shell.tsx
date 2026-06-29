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
  { label: "Partidos en vivo", href: "/partidos-en-vivo" },
  { label: "Fixture", href: "/fixture" },
  { label: "Partidos", href: "/partidos" },
  { label: "Plantel", href: "/roster" },
  { label: "Jugadas", href: "/jugadas" },
  { label: "Estadísticas", href: "/reports" },
  { label: "Mi perfil", href: "/account" },
];

const adminLinks: ShellLink[] = [
  { label: "Importar", href: "/import" },
  { label: "Usuarios", href: "/users" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const links: ShellLink[] =
    currentUser?.role === "admin" ? [...baseLinks, ...adminLinks] : baseLinks;

  return <AppShellClient links={links}>{children}</AppShellClient>;
}
