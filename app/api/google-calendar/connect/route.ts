import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleOAuthClient } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const requestUrl = new URL(request.url);

  if (!user || user.role !== "admin") {
    return NextResponse.redirect(new URL("/sign-in", requestUrl.origin));
  }

  const auth = googleOAuthClient();

  if (!auth) {
    return NextResponse.json(
      { error: "Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET." },
      { status: 400 },
    );
  }

  const url = auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });

  return NextResponse.redirect(url);
}
