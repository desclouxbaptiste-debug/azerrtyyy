// three.js studio for the Quidams (lib/quidams.js) inside the canvas pipeline: the figures are rendered into an
// offscreen WebGL canvas, then drawn into the 2D frame like any other layer. Soft sky light, warm key with a contact
// shadow, cool rim so the dark roles (L'Autorité, L'Ombre) keep an outline.
import * as THREE from "three";

export const LUMIERES = { ciel: 1.7, cle: 2.3, contre: 1.5 };
const CLE_DECALAGE = new THREE.Vector3(1.6, 6, 2.6); // high: short shadows that stay under the figure

export function creerStudio({ ombre = 0.2 } = {}) {
  const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  gl.setPixelRatio(1);
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const ciel = new THREE.HemisphereLight("#FFFFFF", "#B9B2A5", LUMIERES.ciel);
  scene.add(ciel);
  const key = new THREE.DirectionalLight("#FFF3E2", LUMIERES.cle);
  key.position.copy(CLE_DECALAGE);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 0.5, far: 18 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const contre = new THREE.DirectionalLight("#DCE6FF", LUMIERES.contre);
  contre.position.set(-3, 3.2, -3.5);
  scene.add(contre);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: ombre }));
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);
  const plateau = new THREE.Group();
  scene.add(plateau);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 80);
  const rect = { x: 0, y: 0, w: 1, h: 1 };
  /** Renders `plateau` seen from `pos` towards `cible` into a w × h image and draws it at (x, y) of the 2D context. */
  function tourner(ctx, x, y, w, h, { fov = 22, pos = [1, 1.3, 6], cible = [0, 1, 0] } = {}) {
    camera.fov = fov;
    camera.aspect = w / h;
    camera.position.set(...pos);
    camera.lookAt(...cible);
    camera.updateProjectionMatrix();
    gl.setSize(w, h, false);
    gl.render(scene, camera);
    ctx.drawImage(gl.domElement, x, y, w, h);
    Object.assign(rect, { x, y, w, h });
  }
  const v = new THREE.Vector3();
  /** Where a world point (Vector3 or [x, y, z]) landed in the last image drawn by tourner(), in 2D canvas pixels. */
  function projeter(p) {
    if (Array.isArray(p)) v.set(...p); else v.copy(p);
    v.project(camera);
    return { x: rect.x + (v.x + 1) / 2 * rect.w, y: rect.y + (1 - v.y) / 2 * rect.h, devant: v.z < 1 };
  }
  /** Keeps the key light and its shadow centred on the action (shadows only cover a few metres around it). */
  function suivre(x, z) {
    key.target.position.set(x, 0, z);
    key.position.set(x + CLE_DECALAGE.x, CLE_DECALAGE.y, z + CLE_DECALAGE.z);
  }
  return { gl, scene, plateau, ciel, key, contre, sol, camera, tourner, projeter, suivre };
}
