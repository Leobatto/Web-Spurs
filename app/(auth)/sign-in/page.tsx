import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <div>
      <AuthForm mode="sign-in" />
      <p className="mt-4 text-center text-sm text-zinc-600">
        ¿No tenés cuenta? <Link className="font-semibold" href="/sign-up">Crear cuenta</Link>
      </p>
    </div>
  );
}
