"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pearRadiusAt, PEAR_HEIGHT, PEAR_CENTER_Y } from "./geometry/pearProfile";
import { STAGES, localT, smoothstep } from "./scrollStages";

type Droplet = {
  theta: number;
  heightFrac: number;
  scale: number;
  delay: number;
};

const COUNT = 16;

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

export function Droplets({ progressRef }: { progressRef: React.RefObject<number> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const droplets = useMemo<Droplet[]>(() => {
    const rng = seededRandom(42);
    return Array.from({ length: COUNT }, () => ({
      theta: rng() * Math.PI * 2,
      heightFrac: 0.05 + rng() * 0.65,
      scale: 0.018 + rng() * 0.024,
      delay: rng() * 0.7,
    }));
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const progress = progressRef.current ?? 0;
    const metaT = localT(progress, STAGES.metamorphosis);

    droplets.forEach((d, i) => {
      const appear = smoothstep(localT(metaT, [d.delay, Math.min(1, d.delay + 0.3)]));
      const wobble = Math.sin(clock.elapsedTime * 2 + i) * 0.004;
      const radius = pearRadiusAt(d.heightFrac) * 1.03;
      const y = d.heightFrac * PEAR_HEIGHT - PEAR_CENTER_Y;
      dummy.position.set(
        Math.cos(d.theta) * (radius + wobble),
        y,
        Math.sin(d.theta) * (radius + wobble),
      );
      dummy.rotation.set(0, -d.theta, 0);
      const s = d.scale * appear;
      dummy.scale.set(s, s * 1.3, s * 0.85);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 12, 10]} />
      {/*
        True transmission renders near-black against this scene's dark backdrop
        (physically correct, but reads as ugly blobs) — a glossy, lightly tinted
        bead with a strong clearcoat highlight sells "dew drop" far more reliably.
      */}
      <meshPhysicalMaterial
        color="#eef8ff"
        transparent
        opacity={0.8}
        roughness={0.08}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.04}
        envMapIntensity={1.6}
      />
    </instancedMesh>
  );
}
