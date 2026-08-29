"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildLeafGeometry } from "./geometry/leafGeometry";
import { createLeafTexture } from "./textures/leafTexture";

export function PearLeaf({
  position,
  rotation,
  scale = 1,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
}) {
  const geometry = useMemo(() => buildLeafGeometry(), []);
  const texture = useMemo(() => createLeafTexture(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      texture.dispose();
    };
  }, [geometry, texture]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow>
      <meshStandardMaterial map={texture} roughness={0.45} side={THREE.DoubleSide} />
    </mesh>
  );
}
