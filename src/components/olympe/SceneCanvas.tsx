"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { PearStatue } from "./PearStatue";
import { Columns } from "./Columns";
import { GoldDust } from "./GoldDust";
import { Lightning } from "./Lightning";
import { CloudField } from "./CloudField";
import { STAGES, localT, smoothstep, lerp } from "./scrollStages";

type Keyframe = { radius: number; azimuth: number; height: number; targetX: number; targetY: number };

const KF: Keyframe[] = [
  { radius: 5.2, azimuth: -0.5, height: 0.6, targetX: 0, targetY: 0 },
  { radius: 4.6, azimuth: -0.15, height: 0.4, targetX: 0, targetY: 0 },
  { radius: 2.5, azimuth: 0.1, height: 0.15, targetX: 0, targetY: 0.05 },
  { radius: 3.6, azimuth: 0.9, height: 0.5, targetX: 0, targetY: 0 },
  { radius: 3.1, azimuth: 0.55, height: 0.35, targetX: 0.7, targetY: -0.15 },
];

function mixKeyframes(a: Keyframe, b: Keyframe, t: number): Keyframe {
  return {
    radius: lerp(a.radius, b.radius, t),
    azimuth: lerp(a.azimuth, b.azimuth, t),
    height: lerp(a.height, b.height, t),
    targetX: lerp(a.targetX, b.targetX, t),
    targetY: lerp(a.targetY, b.targetY, t),
  };
}

function CameraRig({ progressRef }: { progressRef: React.RefObject<number> }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame(() => {
    const progress = progressRef.current ?? 0;
    let kf: Keyframe;
    if (progress <= STAGES.origin[1]) {
      kf = mixKeyframes(KF[0], KF[1], smoothstep(localT(progress, STAGES.origin)));
    } else if (progress <= STAGES.metamorphosis[1]) {
      kf = mixKeyframes(KF[1], KF[2], smoothstep(localT(progress, STAGES.metamorphosis)));
    } else if (progress <= STAGES.glory[1]) {
      kf = mixKeyframes(KF[2], KF[3], smoothstep(localT(progress, STAGES.glory)));
    } else {
      kf = mixKeyframes(KF[3], KF[4], smoothstep(localT(progress, STAGES.nectar)));
    }

    camera.position.set(
      kf.targetX + Math.sin(kf.azimuth) * kf.radius,
      kf.height,
      Math.cos(kf.azimuth) * kf.radius,
    );
    target.current.set(kf.targetX, kf.targetY, 0);
    camera.lookAt(target.current);
  });

  return null;
}

function AuraGlow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, -0.3]}>
      <circleGeometry args={[2.4, 48]} />
      <meshBasicMaterial color="#4a3616" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export default function SceneCanvas({ progressRef }: { progressRef: React.RefObject<number> }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 38, position: [0, 0.6, 5.2] }} gl={{ antialias: true }}>
      <color attach="background" args={["#0b0a10"]} />
      <fog attach="fog" args={["#0b0a10", 4, 20]} />

      <hemisphereLight color="#e8c98a" groundColor="#150f1e" intensity={0.55} />
      <directionalLight color="#ffd8a0" position={[3, 4.5, 2.5]} intensity={2.4} />
      <directionalLight color="#6f8fff" position={[-4, 1.5, -2]} intensity={0.4} />
      <pointLight color="#ffb463" position={[0, -0.6, 2]} intensity={1.1} distance={5} decay={2} />

      <Suspense fallback={null}>
        <Environment resolution={256}>
          <group rotation={[0, 0.6, 0]}>
            <Lightformer form="rect" intensity={2.2} color="#ffe3b0" position={[0, 4, -3]} scale={[6, 3, 1]} />
            <Lightformer form="rect" intensity={1.1} color="#d8ad3f" position={[-4, 1, 3]} rotation={[0, Math.PI / 3, 0]} scale={[4, 4, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#5f7fe0" position={[4, -1, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[4, 4, 1]} />
            <Lightformer form="ring" intensity={1.4} color="#fff2d6" position={[0, -3, 2]} scale={3} />
          </group>
        </Environment>

        <CloudField />
        <Columns progressRef={progressRef} />
        <AuraGlow />
        <PearStatue progressRef={progressRef} />
        <GoldDust progressRef={progressRef} />
        <Lightning progressRef={progressRef} />
      </Suspense>

      <CameraRig progressRef={progressRef} />
    </Canvas>
  );
}
