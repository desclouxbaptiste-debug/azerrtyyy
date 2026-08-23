"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/immutability -- react-three-fiber mutates refs/uniforms imperatively inside useFrame by design, outside React's render cycle; three's WebGPU/TSL typings are also still incomplete. */

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useAspect, useTexture } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three/webgpu";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { Mesh } from "three";

import {
  abs,
  blendScreen,
  float,
  mod,
  mx_cell_noise_float,
  oneMinus,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  pass,
  mix,
  add,
} from "three/tsl";

const TEXTUREMAP = { src: "https://i.postimg.cc/XYwvXN8D/img-4.png" };
const DEPTHMAP = { src: "https://i.postimg.cc/2SHKQh2q/raw-4.webp" };

extend(THREE as any);

const PostProcessing = ({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number;
  threshold?: number;
  fullScreenEffect?: boolean;
}) => {
  const { gl, scene, camera } = useThree();
  const progressRef = useRef({ value: 0 });

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as any);
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode("output");
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold);

    const uScanProgress = uniform(0);
    progressRef.current = uScanProgress;

    const scanPos = float(uScanProgress.value);
    const uvY = uv().y;
    const scanWidth = float(0.05);
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)));
    const redOverlay = vec3(0.85, 0.05, 0.15).mul(oneMinus(scanLine)).mul(0.4);

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, redOverlay),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0
    );

    const final = withScanEffect.add(bloomPass);

    postProcessing.outputNode = final;

    return postProcessing;
  }, [camera, gl, scene, strength, threshold, fullScreenEffect]);

  useFrame(({ clock }) => {
    progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    render.renderAsync();
  }, 1);

  return null;
};

const WIDTH = 300;
const HEIGHT = 300;

const Scene = () => {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src]);

  const meshRef = useRef<Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (rawMap && depthMap) {
      setVisible(true);
    }
  }, [rawMap, depthMap]);

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0));
    const uProgress = uniform(0);

    const strength = 0.01;

    const tDepthMap = texture(depthMap);

    const tMap = texture(rawMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)));

    const aspect = float(WIDTH).div(HEIGHT);
    const tUv = vec2(uv().x.mul(aspect), uv().y);

    const tiling = vec2(120.0);
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0);

    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2));

    const dist = float(tiledUv.length());
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness);

    const depth = tDepthMap;

    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))));

    const mask = dot.mul(flow).mul(vec3(0.85, 0.05, 0.15).mul(6));

    const final = blendScreen(tMap, mask);

    const material = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    });

    return {
      material,
      uniforms: {
        uPointer,
        uProgress,
      },
    };
  }, [rawMap, depthMap]);

  const [w, h] = useAspect(WIDTH, HEIGHT);

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
    if (meshRef.current && "material" in meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as any;
      if ("opacity" in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07);
      }
    }
  });

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer;
  });

  const scaleFactor = 0.4;
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  );
};

function preloadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

type SceneMode = "checking" | "webgpu" | "fallback";

export interface HeroFuturisticProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export const HeroFuturistic = ({
  eyebrow = "Ligue 1 · Paris",
  title = "Ici c'est Paris",
  subtitle = "Le Paris Saint-Germain, club le plus titré de France, écrit son histoire au Parc des Princes.",
  ctaLabel = "Découvrir le club",
  onCtaClick,
}: HeroFuturisticProps) => {
  const titleWords = title.split(" ");
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState<number[]>([]);
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [mode, setMode] = useState<SceneMode>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkSupport() {
      const gpu = (navigator as { gpu?: { requestAdapter: () => Promise<unknown> } })
        .gpu;

      if (!gpu) {
        if (!cancelled) setMode("fallback");
        return;
      }

      try {
        const adapter = await gpu.requestAdapter();
        if (!adapter) {
          if (!cancelled) setMode("fallback");
          return;
        }

        await Promise.all([
          preloadImage(TEXTUREMAP.src),
          preloadImage(DEPTHMAP.src),
        ]);

        if (!cancelled) setMode("webgpu");
      } catch {
        if (!cancelled) setMode("fallback");
      }
    }

    checkSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07));
    setSubtitleDelay(Math.random() * 0.1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords(visibleWords + 1), 600);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setSubtitleVisible(true), 800);
      return () => clearTimeout(timeout);
    }
  }, [visibleWords, titleWords.length]);

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[#050914]">
      {mode !== "webgpu" ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(133,13,38,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(20,40,110,0.4), transparent 60%), #050914",
          }}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center uppercase">
        <span className="fade-in mb-4 text-xs tracking-[0.4em] text-red-400/90 md:text-sm">
          {eyebrow}
        </span>
        <div className="text-4xl font-extrabold md:text-6xl xl:text-7xl 2xl:text-8xl">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 overflow-hidden text-white lg:gap-x-6">
            {titleWords.map((word, index) => (
              <div
                key={index}
                className={index < visibleWords ? "fade-in" : ""}
                style={{
                  animationDelay: `${index * 0.13 + (delays[index] || 0)}s`,
                  opacity: index < visibleWords ? undefined : 0,
                }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 max-w-xl text-xs font-semibold normal-case text-white/80 md:text-lg xl:text-xl">
          <div
            className={subtitleVisible ? "fade-in-subtitle" : ""}
            style={{
              animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`,
              opacity: subtitleVisible ? undefined : 0,
            }}
          >
            {subtitle}
          </div>
        </div>
        {ctaLabel ? (
          <button
            type="button"
            onClick={onCtaClick}
            className="fade-in-subtitle pointer-events-auto mt-8 rounded-full border border-white/30 bg-white/10 px-8 py-3 text-xs font-bold tracking-widest text-white normal-case backdrop-blur-md transition hover:bg-red-600 hover:border-red-600 md:text-sm"
            style={{
              animationDelay: `${titleWords.length * 0.13 + 0.6 + subtitleDelay}s`,
              opacity: subtitleVisible ? undefined : 0,
            }}
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>

      <button className="explore-btn" style={{ animationDelay: "2.2s" }}>
        Scroll to explore
        <span className="explore-arrow">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="arrow-svg"
          >
            <path d="M11 5V17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 12L11 17L16 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {mode === "webgpu" ? (
        <Canvas
          flat
          gl={async (props) => {
            const renderer = new THREE.WebGPURenderer(props as any);
            await renderer.init();
            return renderer;
          }}
        >
          <PostProcessing fullScreenEffect />
          <Scene />
        </Canvas>
      ) : null}
    </div>
  );
};

export default HeroFuturistic;
