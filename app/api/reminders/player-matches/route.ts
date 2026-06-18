import { NextResponse } from "next/server";
import { sendPendingMatchReminders } from "@/lib/match-reminders";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPendingMatchReminders();

  return NextResponse.json(result);
}
