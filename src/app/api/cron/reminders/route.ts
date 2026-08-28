import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runReminderSweep } from "@/lib/reminders";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runReminderSweep();
  return NextResponse.json(result);
}
