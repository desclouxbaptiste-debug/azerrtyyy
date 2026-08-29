"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildPearGeometry, PEAR_CENTER_Y } from "./geometry/pearProfile";
import { createStatueTextures } from "./textures/marbleGoldTexture";
import { createPearSkinTextures } from "./textures/pearSkinTexture";
import { Droplets } from "./Droplets";
import { PearLeaf } from "./PearLeaf";
import { STAGES, localT, smoothstep, lerp } from "./scrollStages";

export function PearStatue({ progressRef }: { progressRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const statueMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const pearMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const spinRef = useRef(0);

  const geometry = useMemo(() => buildPearGeometry(96), []);
  const statueTex = useMemo(() => createStatueTextures(), []);
  const pearTex = useMemo(() => createPearSkinTextures(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      statueTex.map.dispose();
      statueTex.metalnessMap.dispose();
      statueTex.roughnessMap.dispose();
      pearTex.map.dispose();
      pearTex.roughnessMap.dispose();
    };
  }, [geometry, statueTex, pearTex]);

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current ?? 0;
    const originT = localT(progress, STAGES.origin);
    const metaT = smoothstep(localT(progress, STAGES.metamorphosis));
    const gloryT = localT(progress, STAGES.glory);
    const nectarT = smoothstep(localT(progress, STAGES.nectar));

    if (statueMatRef.current) statueMatRef.current.opacity = 1 - metaT;
    if (pearMatRef.current) pearMatRef.current.opacity = metaT;

    const flashEnvelope = Math.exp(-((metaT - 0.5) ** 2) / (2 * 0.05 * 0.05));
    if (flashRef.current) {
      const s = 0.75 + flashEnvelope * 0.9;
      flashRef.current.scale.setScalar(s);
      (flashRef.current.material as THREE.MeshBasicMaterial).opacity = flashEnvelope * 0.85;
    }
    if (flashLightRef.current) flashLightRef.current.intensity = flashEnvelope * 12;

    // idle spin, always alive; a full explosive 360° turn during "L'Éclat des Dieux"
    spinRef.current += delta * 0.15;
    const gloryRotation = smoothstep(gloryT) * Math.PI * 2;

    if (groupRef.current) {
      groupRef.current.rotation.y = spinRef.current + gloryRotation;
      const bob = Math.sin(clock.elapsedTime * 0.8) * 0.03;
      const settleX = lerp(0, 0.75, nectarT);
      const settleY = lerp(0, -0.15, nectarT) + bob;
      groupRef.current.position.x = settleX;
      groupRef.current.position.y = settleY;
      groupRef.current.rotation.z = lerp(0, -0.12, nectarT);

      const enterScale = lerp(0.82, 1, smoothstep(originT));
      groupRef.current.scale.setScalar(enterScale);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} castShadow receiveShadow renderOrder={0}>
        <meshPhysicalMaterial
          ref={statueMatRef}
          map={statueTex.map}
          metalnessMap={statueTex.metalnessMap}
          roughnessMap={statueTex.roughnessMap}
          metalness={1}
          roughness={1}
          clearcoat={0.4}
          clearcoatRoughness={0.25}
          transparent
          depthWrite
        />
      </mesh>

      <mesh geometry={geometry} castShadow receiveShadow renderOrder={1} scale={1.002}>
        <meshPhysicalMaterial
          ref={pearMatRef}
          map={pearTex.map}
          roughnessMap={pearTex.roughnessMap}
          roughness={1}
          metalness={0}
          transmission={0.32}
          thickness={0.55}
          ior={1.35}
          attenuationColor="#ffb463"
          attenuationDistance={0.55}
          clearcoat={0.15}
          clearcoatRoughness={0.3}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* stem, slightly bent */}
      <mesh position={[0.015, PEAR_CENTER_Y + 0.09, 0]} rotation={[0, 0, 0.16]} castShadow>
        <cylinderGeometry args={[0.013, 0.021, 0.2, 10]} />
        <meshStandardMaterial color="#6b4a2b" roughness={0.75} />
      </mesh>
      <mesh position={[0.05, PEAR_CENTER_Y + 0.19, 0]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.009, 0.014, 0.09, 8]} />
        <meshStandardMaterial color="#5a3f24" roughness={0.75} />
      </mesh>

      {/* two leaves branching from the stem, angled apart like a fresh-picked pear */}
      <PearLeaf
        position={[0.04, PEAR_CENTER_Y + 0.15, 0.01]}
        rotation={[0.3, 0.5, -0.55]}
        scale={0.85}
      />
      <PearLeaf
        position={[0.03, PEAR_CENTER_Y + 0.13, -0.015]}
        rotation={[-0.25, -0.7, 0.65]}
        scale={0.7}
      />

      <mesh ref={flashRef}>
        <sphereGeometry args={[0.72, 24, 24]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={flashLightRef} color="#ffd98a" intensity={0} distance={4} decay={2} />

      <Droplets progressRef={progressRef} />
    </group>
  );
}
