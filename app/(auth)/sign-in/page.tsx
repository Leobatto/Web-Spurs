import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <div>
      <AuthForm mode="sign-in" />
      <p className="mt-4 text-center text-sm text-zinc-600">
        ¿No tenés cuenta? <Link className="font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2" href="/sign-up">Crear cuenta</Link>
      </p>
    </div>
  );
}
