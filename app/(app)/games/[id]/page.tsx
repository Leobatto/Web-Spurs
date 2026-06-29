import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAppUser();
  const { id } = await params;

  redirect(`/partidos/${id}`);
}
