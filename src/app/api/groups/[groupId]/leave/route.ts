import { NextRequest } from "next/server";
import { leaveGroup } from "@/lib/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const body = await request.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";

  if (!clientId) {
    return Response.json({ error: "clientId requis" }, { status: 400 });
  }

  const ok = await leaveGroup(groupId, clientId);
  if (!ok) {
    return Response.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
