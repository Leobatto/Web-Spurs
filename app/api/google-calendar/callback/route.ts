import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleOAuthClient, saveGoogleRefreshToken } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const requestUrl = new URL(request.url);

  if (!user || user.role !== "admin") {
    return NextResponse.redirect(new URL("/sign-in", requestUrl.origin));
  }

  const code = requestUrl.searchParams.get("code");
  const auth = googleOAuthClient();

  if (!code || !auth) {
    return NextResponse.redirect(new URL("/fixture?calendar=error", requestUrl.origin));
  }

  const { tokens } = await auth.getToken(code);

  if (tokens.refresh_token) {
    await saveGoogleRefreshToken(tokens.refresh_token);
  }

  return NextResponse.redirect(new URL("/fixture?calendar=connected", requestUrl.origin));
}
