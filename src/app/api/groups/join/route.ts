import { NextRequest } from "next/server";
import { joinGroupByCode } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const memberName =
    typeof body?.memberName === "string" ? body.memberName.trim() : "";

  if (!code || !clientId || !memberName) {
    return Response.json(
      { error: "Code d'invitation, prénom et identifiant requis" },
      { status: 400 }
    );
  }

  const group = await joinGroupByCode(code, {
    clientId,
    name: memberName.slice(0, 40),
  });

  if (!group) {
    return Response.json(
      { error: "Aucun groupe ne correspond à ce code" },
      { status: 404 }
    );
  }

  return Response.json({ group });
}
