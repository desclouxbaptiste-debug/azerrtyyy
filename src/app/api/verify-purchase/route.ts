import { NextResponse } from "next/server";
import Stripe from "stripe";
import { GOLD_PACKS } from "@/game/economy";

export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paiement non configuré : STRIPE_SECRET_KEY est absent côté serveur." },
      { status: 503 }
    );
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id manquant." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Paiement non confirmé." }, { status: 402 });
    }
    const packId = session.metadata?.packId;
    const pack = GOLD_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Pack introuvable pour cette session." }, { status: 404 });
    }
    return NextResponse.json({ gold: pack.gold, packId: pack.id });
  } catch (err) {
    console.error("Stripe session verification failed", err);
    return NextResponse.json({ error: "Vérification du paiement impossible." }, { status: 502 });
  }
}
