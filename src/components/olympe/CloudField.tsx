"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSoftDiscTexture } from "./textures/spriteTexture";

type Puff = {
  position: [number, number, number];
  scale: number;
  speed: number;
};

function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PUFFS: Puff[] = (() => {
  const rng = seededRandom(21);
  return Array.from({ length: 26 }, () => {
    const angle = rng() * Math.PI * 2;
    const radius = 4.5 + rng() * 3.5;
    return {
      position: [Math.cos(angle) * radius, -2.4 + rng() * 1.2, Math.sin(angle) * radius - 1.2] as [
        number,
        number,
        number,
      ],
      scale: 2.2 + rng() * 3,
      speed: 0.02 + rng() * 0.04,
    };
  });
})();

export function CloudField() {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => createSoftDiscTexture("#fff3df"), []);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.elapsedTime * 0.015;
  });

  return (
    <group ref={groupRef}>
      {PUFFS.map((puff, i) => (
        <sprite key={i} position={puff.position} scale={[puff.scale, puff.scale * 0.6, 1]}>
          <spriteMaterial
            map={texture}
            color="#fff3df"
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
