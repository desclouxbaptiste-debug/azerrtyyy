import { NextRequest } from "next/server";
import { getGroupForClient } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return Response.json({ error: "clientId requis" }, { status: 400 });
  }

  const group = await getGroupForClient(groupId, clientId);
  if (!group) {
    return Response.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  return Response.json({ group });
}
