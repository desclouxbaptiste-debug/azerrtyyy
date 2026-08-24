import { NextRequest } from "next/server";
import { createGroup, getGroupsForClient } from "@/lib/store";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return Response.json({ error: "clientId requis" }, { status: 400 });
  }
  const groups = await getGroupsForClient(clientId);
  return Response.json({ groups });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const memberName =
    typeof body?.memberName === "string" ? body.memberName.trim() : "";

  if (!name || !clientId || !memberName) {
    return Response.json(
      { error: "Nom du groupe, prénom et identifiant requis" },
      { status: 400 }
    );
  }

  const group = await createGroup(name.slice(0, 60), {
    clientId,
    name: memberName.slice(0, 40),
  });
  return Response.json({ group }, { status: 201 });
}
