"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSoftDiscTexture } from "./textures/spriteTexture";
import { STAGES, localT } from "./scrollStages";

const COUNT = 420;

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

export function GoldDust({ progressRef }: { progressRef: React.RefObject<number> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const sprite = useMemo(() => createSoftDiscTexture("#f6d488"), []);

  const { positions, base, phase, speed } = useMemo(() => {
    const rng = seededRandom(99);
    const positions = new Float32Array(COUNT * 3);
    const base = new Float32Array(COUNT * 3);
    const phase = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const radius = 1.6 + rng() * 4.2;
      const theta = rng() * Math.PI * 2;
      const y = (rng() - 0.5) * 4.2;
      base[i * 3] = Math.cos(theta) * radius;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = Math.sin(theta) * radius - 1.2;
      positions.set([base[i * 3], base[i * 3 + 1], base[i * 3 + 2]], i * 3);
      phase[i] = rng() * Math.PI * 2;
      speed[i] = 0.15 + rng() * 0.3;
    }
    return { positions, base, phase, speed };
  }, []);

  useFrame(({ clock }) => {
    const progress = progressRef.current ?? 0;
    const gloryBurst = 1 - Math.abs(localT(progress, STAGES.glory) - 0.5) * 2;
    const intensity = 0.35 + Math.max(0, gloryBurst) * 0.9;

    if (materialRef.current) {
      materialRef.current.opacity = intensity;
      materialRef.current.size = 0.05 + Math.max(0, gloryBurst) * 0.05;
    }

    const geom = pointsRef.current?.geometry;
    const posAttr = geom?.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!posAttr) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const drift = Math.sin(t * speed[i] + phase[i]);
      const swirl = t * speed[i] * 0.2 + phase[i];
      posAttr.setXYZ(
        i,
        base[i * 3] + Math.cos(swirl) * 0.15,
        base[i * 3 + 1] + drift * 0.25,
        base[i * 3 + 2] + Math.sin(swirl) * 0.15,
      );
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        map={sprite}
        color="#f6d488"
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
