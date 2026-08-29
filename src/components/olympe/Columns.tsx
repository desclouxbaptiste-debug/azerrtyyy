"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createStatueTextures } from "./textures/marbleGoldTexture";
import { STAGES, localT, smoothstep, lerp } from "./scrollStages";

type ColumnDef = {
  angle: number;
  radius: number;
  height: number;
  y: number;
  tilt: number;
  splitDelay: number;
};

// `angle` uses the SAME convention as CameraRig (position = sin(angle)*radius,
// cos(angle)*radius): the camera sweeps roughly angle ∈ [-0.5, 0.9] rad, so
// columns are kept well clear of that arc — mostly at negative-cos ("behind
// the pear, ahead of the camera") angles, well away from where the camera
// itself ever stands. Radius ≥ 5.5 gives extra margin against the dolly-in.
const COLUMNS: ColumnDef[] = [
  { angle: -2.6, radius: 6.2, height: 4.4, y: -0.8, tilt: 0.03, splitDelay: 0 },
  { angle: -2.0, radius: 5.6, height: 3.8, y: -1.2, tilt: -0.05, splitDelay: 0.15 },
  { angle: Math.PI, radius: 7, height: 5, y: -0.4, tilt: 0.0, splitDelay: 0.3 },
  { angle: 2.0, radius: 5.6, height: 4, y: -1.0, tilt: 0.06, splitDelay: 0.15 },
  { angle: 2.6, radius: 6.2, height: 4.3, y: -0.6, tilt: -0.03, splitDelay: 0 },
];

function Column({
  def,
  texSeed,
  progressRef,
}: {
  def: ColumnDef;
  texSeed: number;
  progressRef: React.RefObject<number>;
}) {
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const tex = useMemo(() => createStatueTextures(texSeed, 512), [texSeed]);

  useFrame(({ clock }) => {
    const progress = progressRef.current ?? 0;
    const metaT = smoothstep(localT(progress, STAGES.metamorphosis));
    const local = smoothstep(localT(metaT, [def.splitDelay, Math.min(1, def.splitDelay + 0.6)]));
    const gap = lerp(0, 0.55, local) + Math.sin(clock.elapsedTime * 0.3 + def.angle) * 0.01;
    if (leftRef.current) leftRef.current.position.x = -gap;
    if (rightRef.current) rightRef.current.position.x = gap;
  });

  const x = Math.sin(def.angle) * def.radius;
  const z = Math.cos(def.angle) * def.radius;

  return (
    <group position={[x, def.y, z]} rotation={[0, def.angle, def.tilt]}>
      <group ref={leftRef}>
        <mesh position={[0, def.height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.32, def.height, 20, 1, false, 0, Math.PI]} />
          <meshStandardMaterial
            map={tex.map}
            metalnessMap={tex.metalnessMap}
            roughnessMap={tex.roughnessMap}
            metalness={0.35}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      <group ref={rightRef}>
        <mesh position={[0, def.height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.32, def.height, 20, 1, false, Math.PI, Math.PI]} />
          <meshStandardMaterial
            map={tex.map}
            metalnessMap={tex.metalnessMap}
            roughnessMap={tex.roughnessMap}
            metalness={0.35}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

export function Columns({ progressRef }: { progressRef: React.RefObject<number> }) {
  return (
    <group>
      {COLUMNS.map((def, i) => (
        <Column key={i} def={def} texSeed={100 + i} progressRef={progressRef} />
      ))}
    </group>
  );
}
