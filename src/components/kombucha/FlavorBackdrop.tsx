"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { Flavor } from "./flavors";

function gradientCss(flavor: Flavor) {
  return `radial-gradient(circle at 18% 15%, ${flavor.from}66, transparent 55%), linear-gradient(160deg, ${flavor.from} 0%, ${flavor.to} 100%)`;
}

export function FlavorBackdrop({ flavor }: { flavor: Flavor }) {
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  const frontIsA = useRef(true);
  const mounted = useRef(false);

  useEffect(() => {
    const a = layerARef.current;
    const b = layerBRef.current;
    if (!a || !b) return;

    if (!mounted.current) {
      a.style.background = gradientCss(flavor);
      gsap.set(a, { opacity: 1 });
      gsap.set(b, { opacity: 0 });
      mounted.current = true;
      return;
    }

    const incoming = frontIsA.current ? b : a;
    const outgoing = frontIsA.current ? a : b;
    incoming.style.background = gradientCss(flavor);
    gsap.to(incoming, { opacity: 1, duration: 0.6, ease: "power2.inOut" });
    gsap.to(outgoing, { opacity: 0, duration: 0.6, ease: "power2.inOut" });
    frontIsA.current = !frontIsA.current;
  }, [flavor]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div ref={layerARef} className="absolute inset-0" />
      <div ref={layerBRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[#FCF6EC]/45" />
    </div>
  );
}
