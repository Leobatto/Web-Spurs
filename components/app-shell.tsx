import { getCurrentUser } from "@/lib/auth";
import { AppShellClient } from "@/components/app-shell-client";

type ShellLink = [string, string];

const baseLinks: ShellLink[] = [
  ["Dashboard", "/dashboard"],
  ["Torneos", "/torneo"],
  ["Multimedia", "/multimedia"],
  ["Instagram", "/instagram"],
  ["Fixture", "/fixture"],
  ["Partidos", "/partidos"],
  ["Plantel", "/roster"],
  ["Importar", "/import"],
  ["Jugadas", "/jugadas"],
  ["Estadísticas", "/reports"],
  ["Mi perfil", "/account"],
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const links: ShellLink[] =
    currentUser?.role === "admin"
      ? [...baseLinks, ["Usuarios", "/users"] as ShellLink]
      : currentUser?.role === "read"
        ? [["Dashboard", "/dashboard"], ["Instagram", "/instagram"]]
        : baseLinks;

  return <AppShellClient links={links}>{children}</AppShellClient>;
}
