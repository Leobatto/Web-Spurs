import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <div>
      <AuthForm mode="sign-up" />
      <p className="mt-4 text-center text-sm text-zinc-600">
        ¿Ya tenés cuenta? <Link className="font-semibold" href="/sign-in">Ingresar</Link>
      </p>
    </div>
  );
}
