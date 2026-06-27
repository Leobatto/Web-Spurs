import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm text-zinc-600">
        Volver a <Link className="font-semibold" href="/sign-in">Ingresar</Link>
      </p>
    </div>
  );
}
