"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GameEngine } from "./engine/GameEngine";
import { HudStore } from "./hud/HudStore";
import { HUD } from "./hud/HUD";
import { MainMenu } from "./hud/MainMenu";
import { DeathScreen } from "./hud/DeathScreen";
import { Shop } from "./hud/Shop";
import { MobileControls } from "./hud/MobileControls";
import {
  addCredits,
  addGold,
  loadEconomy,
  recordRunResult,
  unlockWeapon,
  unlockWeaponWithGold,
  type EconomyState,
} from "./economy";
import { isTouchDevice, type InputController } from "./engine/InputController";
import type { WeaponId } from "./weapons-data";

const PROCESSED_SESSION_KEY = "strike-protocol-last-session";

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const runCreditsRef = useRef(0);

  const [hudStore] = useState(() => new HudStore());
  const [economy, setEconomy] = useState<EconomyState>(() => loadEconomy());
  const [uiScreen, setUiScreen] = useState<"menu" | "shop">("menu");
  const [lastRun, setLastRun] = useState({ wave: 0, kills: 0, credits: 0 });
  const [pointerLocked, setPointerLocked] = useState(false);
  const [isTouch] = useState(() => isTouchDevice());
  const [inputController, setInputController] = useState<InputController | null>(null);

  const { phase } = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot, hudStore.getSnapshot);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine({
      canvas: canvasRef.current,
      hud: hudStore,
      ownedWeapons: economy.ownedWeapons,
      onReward: (credits) => {
        runCreditsRef.current += credits;
        setEconomy((prev) => addCredits(prev, credits));
      },
      onRunEnd: (wave, kills) => {
        setEconomy((prev) => recordRunResult(prev, wave, kills));
        setLastRun({ wave, kills, credits: runCreditsRef.current });
      },
    });
    engineRef.current = engine;
    setInputController(engine.getInputController());
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engine is created once; ownedWeapons at mount time seeds the initial weapon, later runs pass a fresh list via startRun
  }, []);

  useEffect(() => {
    hudStore.set({ credits: economy.credits, gold: economy.gold });
  }, [hudStore, economy.credits, economy.gold]);

  useEffect(() => {
    const onLockChange = () => {
      setPointerLocked(document.pointerLockElement === canvasRef.current);
    };
    document.addEventListener("pointerlockchange", onLockChange);
    return () => document.removeEventListener("pointerlockchange", onLockChange);
  }, []);

  // Handle returning from a Stripe Checkout redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get("purchase");
    const sessionId = params.get("session_id");
    if (!purchase) return;

    window.history.replaceState({}, "", "/game");
    if (purchase !== "success" || !sessionId) return;

    const lastProcessed = window.localStorage.getItem(PROCESSED_SESSION_KEY);
    if (lastProcessed === sessionId) return;

    fetch(`/api/verify-purchase?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data: { gold?: number }) => {
        if (data.gold) {
          window.localStorage.setItem(PROCESSED_SESSION_KEY, sessionId);
          setEconomy((prev) => addGold(prev, data.gold!));
        }
      })
      .catch(() => {});
  }, []);

  function handlePlay() {
    const engine = engineRef.current;
    if (!engine) return;
    runCreditsRef.current = 0;
    engine.startRun(economy.ownedWeapons);
    if (!engine.isTouch) engine.requestPointerLock();
  }

  function handleUnlockWithCredits(id: WeaponId) {
    setEconomy((prev) => unlockWeapon(prev, id));
  }

  function handleUnlockWithGold(id: WeaponId, goldCost: number) {
    setEconomy((prev) => unlockWeaponWithGold(prev, id, goldCost));
  }

  const showMenu = phase === "menu" && uiScreen === "menu";
  const showShop = phase === "menu" && uiScreen === "shop";
  const showHud = phase === "playing" || phase === "wave-intermission";
  const showDeath = phase === "dead";
  const showResumeGate = showHud && !isTouch && !pointerLocked;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0c12]">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        onClick={() => {
          if (showHud && !isTouch) engineRef.current?.requestPointerLock();
        }}
      />

      <HUD store={hudStore} />

      {showHud && isTouch && inputController && (
        <MobileControls input={inputController} ownedWeapons={economy.ownedWeapons} />
      )}

      {showResumeGate && (
        <button
          onClick={() => engineRef.current?.requestPointerLock()}
          className="fixed inset-0 z-[45] flex items-center justify-center bg-black/50 text-lg font-semibold text-white"
        >
          Cliquer pour continuer
        </button>
      )}

      {showMenu && (
        <MainMenu
          economy={economy}
          isTouch={isTouch}
          onPlay={handlePlay}
          onShop={() => setUiScreen("shop")}
        />
      )}

      {showShop && (
        <Shop
          economy={economy}
          onUnlockWithCredits={handleUnlockWithCredits}
          onUnlockWithGold={handleUnlockWithGold}
          onClose={() => setUiScreen("menu")}
        />
      )}

      {showDeath && (
        <DeathScreen
          wave={lastRun.wave}
          kills={lastRun.kills}
          creditsEarned={lastRun.credits}
          onRetry={handlePlay}
          onMenu={() => {
            hudStore.set({ phase: "menu" });
            setUiScreen("menu");
          }}
        />
      )}
    </div>
  );
}
