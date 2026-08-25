"use client";

import { useEffect, useState } from "react";
import { WEAPON_ORDER, WEAPONS, type WeaponId } from "../weapons-data";
import { GOLD_PACKS, type EconomyState } from "../economy";

export function Shop({
  economy,
  onUnlockWithCredits,
  onUnlockWithGold,
  onClose,
}: {
  economy: EconomyState;
  onUnlockWithCredits: (id: WeaponId) => void;
  onUnlockWithGold: (id: WeaponId, goldCost: number) => void;
  onClose: () => void;
}) {
  const [buying, setBuying] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Navigating away is an external-system effect, not something to do mid-render.
  useEffect(() => {
    if (redirectUrl) window.location.href = redirectUrl;
  }, [redirectUrl]);

  async function buyGoldPack(packId: string) {
    setCheckoutError(null);
    setBuying(packId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setCheckoutError(data.error ?? "Paiement indisponible pour le moment.");
        return;
      }
      setRedirectUrl(data.url);
    } catch {
      setCheckoutError("Impossible de contacter le serveur de paiement.");
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0c12] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tight">BOUTIQUE</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-white/25 px-4 py-2 text-sm hover:bg-white/10"
          >
            Fermer
          </button>
        </div>

        <div className="mb-4 flex gap-6 text-sm">
          <span className="text-emerald-300">{economy.credits} crédits</span>
          <span className="text-amber-300">{economy.gold} or</span>
        </div>

        <section className="mb-10">
          <h3 className="mb-3 text-sm tracking-widest text-white/50">ARMES</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {WEAPON_ORDER.map((id) => {
              const def = WEAPONS[id];
              const owned = economy.ownedWeapons.includes(id);
              const canAffordCredits = economy.credits >= def.unlockCost;
              const goldCost = Math.max(1, Math.round(def.unlockCost / 8));
              return (
                <div
                  key={id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                  style={{ boxShadow: owned ? `0 0 0 1px #${def.color.toString(16).padStart(6, "0")}55` : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold" style={{ color: `#${def.color.toString(16).padStart(6, "0")}` }}>
                      {def.name}
                    </span>
                    {owned && <span className="text-xs text-emerald-300">POSSÉDÉE</span>}
                  </div>
                  <p className="mt-1 text-xs text-white/50">{def.description}</p>
                  {!owned && def.unlockCost > 0 && (
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={!canAffordCredits}
                        onClick={() => onUnlockWithCredits(id)}
                        className="flex-1 rounded bg-emerald-500/20 px-2 py-1.5 text-xs font-semibold text-emerald-300 disabled:opacity-30"
                      >
                        {def.unlockCost} crédits
                      </button>
                      <button
                        disabled={economy.gold < goldCost}
                        onClick={() => onUnlockWithGold(id, goldCost)}
                        className="flex-1 rounded bg-amber-500/20 px-2 py-1.5 text-xs font-semibold text-amber-300 disabled:opacity-30"
                      >
                        {goldCost} or
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm tracking-widest text-white/50">RECHARGER EN OR</h3>
          <p className="mb-3 text-xs text-white/40">
            Paiement réel via Stripe. Nécessite que le serveur ait une clé Stripe configurée —
            voir README pour la mise en route.
          </p>
          {checkoutError && (
            <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-xs text-red-300">{checkoutError}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {GOLD_PACKS.map((pack) => (
              <button
                key={pack.id}
                disabled={buying === pack.id}
                onClick={() => buyGoldPack(pack.id)}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10 disabled:opacity-50"
              >
                <div>
                  <div className="font-semibold">{pack.label}</div>
                  <div className="text-xs text-amber-300">
                    {pack.gold} or {pack.bonus && <span className="text-white/40">({pack.bonus})</span>}
                  </div>
                </div>
                <div className="text-lg font-bold">{pack.priceEur.toFixed(2)} €</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
