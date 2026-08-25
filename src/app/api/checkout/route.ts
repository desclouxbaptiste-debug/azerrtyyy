import { NextResponse } from "next/server";
import Stripe from "stripe";
import { GOLD_PACKS } from "@/game/economy";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paiement non configuré : STRIPE_SECRET_KEY est absent côté serveur." },
      { status: 503 }
    );
  }

  let packId: string | undefined;
  try {
    const body = await request.json();
    packId = body?.packId;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const pack = GOLD_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Pack d'Or inconnu." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(pack.priceEur * 100),
            product_data: {
              name: `Strike Protocol — ${pack.label}`,
              description: `${pack.gold} Or`,
            },
          },
        },
      ],
      metadata: { packId: pack.id },
      success_url: `${origin}/game?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/game?purchase=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session creation failed", err);
    return NextResponse.json({ error: "Le paiement a échoué à démarrer." }, { status: 502 });
  }
}
