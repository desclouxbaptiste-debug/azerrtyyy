"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import type { Flavor } from "./flavors";
import { drawLabel } from "./labelTexture";
import { lerpColor } from "./colorUtils";

function KombuchaCan({ flavor }: { flavor: Flavor }) {
  const floatGroup = useRef<THREE.Group>(null);
  const colorsRef = useRef({ from: flavor.from, to: flavor.to });

  const canvasEl = useMemo(() => {
    const el = document.createElement("canvas");
    drawLabel(el, flavor.from, flavor.to, flavor.name);
    return el;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvasEl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }, [canvasEl]);

  useEffect(() => {
    const prev = { ...colorsRef.current };
    const progress = { t: 0 };
    const tween = gsap.to(progress, {
      t: 1,
      duration: 0.55,
      ease: "power2.inOut",
      onUpdate: () => {
        const from = lerpColor(prev.from, flavor.from, progress.t);
        const to = lerpColor(prev.to, flavor.to, progress.t);
        drawLabel(canvasEl, from, to, flavor.name);
        texture.needsUpdate = true;
      },
      onComplete: () => {
        colorsRef.current = { from: flavor.from, to: flavor.to };
      },
    });
    return () => {
      tween.kill();
    };
  }, [flavor, canvasEl, texture]);

  useFrame(({ clock }) => {
    if (!floatGroup.current) return;
    floatGroup.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.08;
    floatGroup.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.015;
  });

  return (
    <group ref={floatGroup}>
      {/* Rotated so the wordmark (drawn at the texture's u=0.5) faces the camera instead of the UV seam. */}
      <group rotation={[0, Math.PI, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.62, 0.62, 1.9, 64, 1, true]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.65}
            metalness={0.05}
            envMapIntensity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 0.97, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.62, 0.06, 64]} />
          <meshStandardMaterial color="#d8d8dc" metalness={1} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.97, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.58, 0.05, 64]} />
          <meshStandardMaterial color="#bcbcc2" metalness={1} roughness={0.4} />
        </mesh>

        <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.03, 16, 64]} />
          <meshStandardMaterial color="#e4e4e8" metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.03, 16, 64]} />
          <meshStandardMaterial color="#c9c9cf" metalness={1} roughness={0.35} />
        </mesh>

        <mesh position={[0, 1.005, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.018, 12, 24]} />
          <meshStandardMaterial color="#eaeaef" metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export default function CanCanvas({ flavor }: { flavor: Flavor }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.1, 3.4], fov: 35 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} castShadow />
      <directionalLight position={[-3, -1, -2]} intensity={0.3} />
      <Suspense fallback={null}>
        {/* Procedural studio lighting: no external HDR asset, built entirely from primitives. */}
        <Environment resolution={256}>
          <group rotation={[0, 0.6, 0]}>
            <Lightformer form="rect" intensity={1.4} color="#fff3d6" position={[0, 4, -4]} scale={[6, 3, 1]} />
            <Lightformer form="rect" intensity={0.9} color="#ffb27a" position={[-4, 1, 3]} rotation={[0, Math.PI / 3, 0]} scale={[4, 4, 1]} />
            <Lightformer form="rect" intensity={0.7} color="#7ab8ff" position={[4, -1, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[4, 4, 1]} />
            <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, -3, 2]} scale={3} />
          </group>
        </Environment>
        <KombuchaCan flavor={flavor} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.4}
        minPolarAngle={Math.PI / 2 - 0.5}
        maxPolarAngle={Math.PI / 2 + 0.5}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
