import { NextRequest } from "next/server";
import { addItem } from "@/lib/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const body = await request.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const quantity =
    typeof body?.quantity === "string" ? body.quantity.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!clientId || !name) {
    return Response.json(
      { error: "Nom de l'article requis" },
      { status: 400 }
    );
  }

  const item = await addItem(groupId, clientId, {
    name: name.slice(0, 80),
    quantity: quantity.slice(0, 20),
    note: note.slice(0, 140),
  });

  if (!item) {
    return Response.json(
      { error: "Groupe introuvable ou accès refusé" },
      { status: 404 }
    );
  }

  return Response.json({ item }, { status: 201 });
}
