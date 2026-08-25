import * as THREE from "three";

export interface Obstacle {
  center: THREE.Vector2;
  halfExtent: THREE.Vector2;
}

export interface ArenaData {
  group: THREE.Group;
  obstacles: Obstacle[];
  bounds: number; // radius of the playable area
  spawnPoints: THREE.Vector3[];
  fog: THREE.FogExp2;
}

const NEON = [0x5ad1ff, 0xff5a5a, 0xa06bff, 0xffb545, 0x4dffb0];

/** Builds a low-poly, fog-shrouded arena. Everything here is flat-shaded
 * primitive geometry with no textures/shadows so it stays cheap on mobile GPUs. */
export function buildArena(): ArenaData {
  const group = new THREE.Group();
  const bounds = 42;

  // Sky gradient dome — a single cheap shaded mesh instead of a texture,
  // so the void above the arena wall isn't flat black.
  const skyGeo = new THREE.SphereGeometry(90, 12, 8);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x0d1424) },
      bottom: { value: new THREE.Color(0x1c2a44) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      uniform vec3 top;
      uniform vec3 bottom;
      void main() {
        float h = clamp(normalize(vWorldPos).y * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, h), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  group.add(sky);

  // Ground
  const groundGeo = new THREE.CircleGeometry(bounds + 4, 32);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x1b2030 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Faint grid overlay for depth perception without a texture
  const grid = new THREE.GridHelper(bounds * 2, 28, 0x2a3550, 0x1a2035);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material & { opacity: number }).opacity = 0.5;
  grid.position.y = 0.01;
  group.add(grid);

  // Perimeter wall ring (also doubles as a visible boundary)
  const wallGeo = new THREE.CylinderGeometry(bounds + 2, bounds + 2, 6, 24, 1, true);
  const wallMat = new THREE.MeshLambertMaterial({
    color: 0x262d42,
    side: THREE.BackSide,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 3;
  group.add(wall);

  // Ambient + one directional "sun" light + a couple of cheap neon point lights
  const hemi = new THREE.HemisphereLight(0x9fc4ff, 0x141a2a, 1.15);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xeaf2ff, 1.7);
  sun.position.set(20, 30, 10);
  group.add(sun);
  const fill = new THREE.DirectionalLight(0x5ad1ff, 0.35);
  fill.position.set(-18, 12, -14);
  group.add(fill);

  const obstacles: Obstacle[] = [];
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x2b3348,
    roughness: 0.7,
    metalness: 0.1,
  });

  const layout: { x: number; z: number; w: number; d: number; h: number }[] = [
    { x: 8, z: 4, w: 2.4, d: 2.4, h: 2 },
    { x: -9, z: -3, w: 3, d: 2, h: 1.6 },
    { x: 3, z: -12, w: 2, d: 4, h: 2.2 },
    { x: -14, z: 10, w: 4, d: 2, h: 1.8 },
    { x: 16, z: -8, w: 2.5, d: 2.5, h: 2.4 },
    { x: -4, z: 18, w: 3, d: 3, h: 2 },
    { x: 22, z: 12, w: 2, d: 2, h: 1.6 },
    { x: -22, z: -14, w: 3.5, d: 2, h: 2 },
    { x: 0, z: -24, w: 5, d: 2, h: 2 },
    { x: -2, z: 2, w: 1.8, d: 1.8, h: 1.4 },
  ];

  for (let i = 0; i < layout.length; i++) {
    const c = layout[i];
    const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
    const mesh = new THREE.Mesh(geo, crateMat);
    mesh.position.set(c.x, c.h / 2, c.z);
    group.add(mesh);

    // Thin emissive trim strip for a "beau mais léger" sci-fi look
    const trimGeo = new THREE.BoxGeometry(c.w + 0.05, 0.06, c.d + 0.05);
    const trimMat = new THREE.MeshBasicMaterial({ color: NEON[i % NEON.length] });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(c.x, c.h + 0.03, c.z);
    group.add(trim);

    obstacles.push({
      center: new THREE.Vector2(c.x, c.z),
      halfExtent: new THREE.Vector2(c.w / 2 + 0.4, c.d / 2 + 0.4),
    });
  }

  // Fog hides the far draw distance cheaply instead of rendering detail there
  const fog = new THREE.FogExp2(0x0a0c12, 0.022);

  const spawnPoints: THREE.Vector3[] = [];
  const spawnCount = 10;
  for (let i = 0; i < spawnCount; i++) {
    const angle = (i / spawnCount) * Math.PI * 2;
    spawnPoints.push(
      new THREE.Vector3(Math.cos(angle) * (bounds - 3), 0, Math.sin(angle) * (bounds - 3))
    );
  }

  return { group, obstacles, bounds, spawnPoints, fog };
}
