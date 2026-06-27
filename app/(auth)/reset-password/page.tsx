import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;

  return (
    <div>
      <ResetPasswordForm token={params.token ?? ""} />
      <p className="mt-4 text-center text-sm text-zinc-600">
        Volver a <Link className="font-semibold" href="/sign-in">Ingresar</Link>
      </p>
    </div>
  );
}
