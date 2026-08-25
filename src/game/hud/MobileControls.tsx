"use client";

import { useEffect, useRef, useState } from "react";
import type { InputController } from "../engine/InputController";
import { WEAPON_ORDER, type WeaponId } from "../weapons-data";

export function MobileControls({
  input,
  ownedWeapons,
}: {
  input: InputController;
  ownedWeapons: WeaponId[];
}) {
  const joystickTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lookLast = useRef<{ x: number; y: number } | null>(null);
  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [joystickVisible, setJoystickVisible] = useState(false);
  const [joystickBase, setJoystickBase] = useState({ x: 90, y: 0 });

  useEffect(() => {
    const RADIUS = 55;

    function onTouchStart(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        const half = window.innerWidth / 2;
        if (t.clientX < half && joystickTouchId.current === null) {
          joystickTouchId.current = t.identifier;
          joystickOrigin.current = { x: t.clientX, y: t.clientY };
          setJoystickBase({ x: t.clientX, y: t.clientY });
          setJoystickVisible(true);
          setKnob({ x: 0, y: 0 });
        } else if (t.clientX >= half && lookTouchId.current === null) {
          lookTouchId.current = t.identifier;
          lookLast.current = { x: t.clientX, y: t.clientY };
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joystickTouchId.current && joystickOrigin.current) {
          let dx = t.clientX - joystickOrigin.current.x;
          let dy = t.clientY - joystickOrigin.current.y;
          const len = Math.hypot(dx, dy);
          if (len > RADIUS) {
            dx = (dx / len) * RADIUS;
            dy = (dy / len) * RADIUS;
          }
          setKnob({ x: dx, y: dy });
          input.setMobileMove(dx / RADIUS, -dy / RADIUS);
        } else if (t.identifier === lookTouchId.current && lookLast.current) {
          const dx = t.clientX - lookLast.current.x;
          const dy = t.clientY - lookLast.current.y;
          lookLast.current = { x: t.clientX, y: t.clientY };
          input.addMobileLook(dx, dy);
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joystickTouchId.current) {
          joystickTouchId.current = null;
          joystickOrigin.current = null;
          setJoystickVisible(false);
          setKnob({ x: 0, y: 0 });
          input.setMobileMove(0, 0);
        } else if (t.identifier === lookTouchId.current) {
          lookTouchId.current = null;
          lookLast.current = null;
        }
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [input]);

  const weapons = WEAPON_ORDER.filter((w) => ownedWeapons.includes(w));

  return (
    <div className="fixed inset-0 z-40 touch-none">
      {joystickVisible && (
        <div
          className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/5"
          style={{ left: joystickBase.x, top: joystickBase.y }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
            style={{ transform: `translate(${knob.x - 24}px, ${knob.y - 24}px)` }}
          />
        </div>
      )}

      <div className="absolute bottom-8 right-6 flex flex-col items-end gap-3">
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            input.setMobileFiring(true);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            input.setMobileFiring(false);
          }}
          className="pointer-events-auto h-20 w-20 rounded-full border-2 border-red-400/60 bg-red-500/30 text-sm font-bold text-white active:scale-95"
        >
          TIR
        </button>
        <div className="flex gap-3">
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              input.setMobileAds(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              input.setMobileAds(false);
            }}
            className="pointer-events-auto h-14 w-14 rounded-full border border-white/30 bg-black/40 text-[10px] text-white active:scale-95"
          >
            VISER
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              input.triggerMobileReload();
            }}
            className="pointer-events-auto h-14 w-14 rounded-full border border-white/30 bg-black/40 text-[10px] text-white active:scale-95"
          >
            RECH.
          </button>
        </div>
      </div>

      <button
        onTouchStart={(e) => {
          e.stopPropagation();
          input.setMobileSprint(true);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          input.setMobileSprint(false);
        }}
        className="pointer-events-auto absolute bottom-32 left-40 h-12 w-12 rounded-full border border-white/30 bg-black/40 text-[9px] text-white active:scale-95"
      >
        COURIR
      </button>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
        {weapons.map((w, i) => (
          <button
            key={w}
            onTouchStart={(e) => {
              e.stopPropagation();
              input.selectMobileWeapon(i);
            }}
            className="pointer-events-auto h-10 w-10 rounded border border-white/30 bg-black/40 text-[10px] font-bold text-white active:scale-95"
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
