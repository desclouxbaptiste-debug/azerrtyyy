"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STAGES, localT } from "./scrollStages";

type Bolt = {
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  nextStrike: number;
  life: number;
};

const BOLT_COUNT = 3;
const SEGMENTS = 9;

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

function buildJaggedPoints(origin: THREE.Vector3, dir: THREE.Vector3, length: number): Float32Array {
  const points = new Float32Array((SEGMENTS + 1) * 3);
  const perp = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const wobble = (Math.random() - 0.5) * 0.22 * (1 - t * 0.6);
    const p = origin
      .clone()
      .addScaledVector(dir, length * t)
      .addScaledVector(perp, wobble);
    points.set([p.x, p.y, p.z], i * 3);
  }
  return points;
}

export function Lightning({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const lineRefs = useRef<(THREE.Line | null)[]>([]);

  const bolts = useMemo<Bolt[]>(() => {
    const rng = seededRandom(17);
    return Array.from({ length: BOLT_COUNT }, (_, i) => ({
      origin: new THREE.Vector3(
        (i - 1) * 1.4 + (rng() - 0.5) * 0.4,
        2.6 + rng() * 0.6,
        -1.6 + rng() * 0.6,
      ),
      dir: new THREE.Vector3((rng() - 0.5) * 0.3, -1, (rng() - 0.5) * 0.2).normalize(),
      length: 1.6 + rng() * 0.8,
      nextStrike: rng() * 2,
      life: 0,
    }));
  }, []);

  const lines = useMemo(
    () =>
      Array.from(
        { length: BOLT_COUNT },
        () =>
          new THREE.Line(
            new THREE.BufferGeometry().setAttribute(
              "position",
              new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3),
            ),
            new THREE.LineBasicMaterial({
              color: "#eaf2ff",
              transparent: true,
              opacity: 0,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
      ),
    [],
  );

  useEffect(() => {
    return () => {
      lines.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
    };
  }, [lines]);

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current ?? 0;
    const gloryActive = localT(progress, STAGES.glory) > 0.05 && localT(progress, STAGES.glory) < 0.95;
    if (groupRef.current) groupRef.current.visible = gloryActive;
    if (!gloryActive) return;

    bolts.forEach((bolt, i) => {
      const line = lineRefs.current[i];
      if (!line) return;
      bolt.life -= delta;
      bolt.nextStrike -= delta;
      if (bolt.nextStrike <= 0 && bolt.life <= 0) {
        bolt.life = 0.06 + Math.random() * 0.08;
        bolt.nextStrike = 0.4 + Math.random() * 1.1;
        const pts = buildJaggedPoints(bolt.origin, bolt.dir, bolt.length);
        (line.geometry as THREE.BufferGeometry).setAttribute("position", new THREE.BufferAttribute(pts, 3));
      }
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = bolt.life > 0 ? 0.55 + Math.sin(clock.elapsedTime * 60 + i) * 0.35 : 0;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {lines.map((line, i) => (
        <primitive
          key={i}
          object={line}
          ref={(el: THREE.Line | null) => {
            lineRefs.current[i] = el;
          }}
        />
      ))}
    </group>
  );
}
