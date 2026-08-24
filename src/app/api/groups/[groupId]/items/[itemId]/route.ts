import { NextRequest } from "next/server";
import { deleteItem, setItemChecked } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string }> }
) {
  const { groupId, itemId } = await params;
  const body = await request.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const checked = Boolean(body?.checked);

  if (!clientId) {
    return Response.json({ error: "clientId requis" }, { status: 400 });
  }

  const group = await setItemChecked(groupId, clientId, itemId, checked);
  if (!group) {
    return Response.json(
      { error: "Article ou groupe introuvable" },
      { status: 404 }
    );
  }

  return Response.json({ group });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string }> }
) {
  const { groupId, itemId } = await params;
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "";

  if (!clientId) {
    return Response.json({ error: "clientId requis" }, { status: 400 });
  }

  const ok = await deleteItem(groupId, clientId, itemId);
  if (!ok) {
    return Response.json(
      { error: "Article ou groupe introuvable" },
      { status: 404 }
    );
  }

  return Response.json({ ok: true });
}
