// three.js studio for the Quidams (lib/quidams.js) inside the canvas pipeline: the figures are rendered into an
// offscreen WebGL canvas, then drawn into the 2D frame like any other layer. Soft sky light, warm key with a contact
// shadow, cool rim so the dark roles (L'Autorité, L'Ombre) keep an outline.
import * as THREE from "three";

export function creerStudio({ ombre = 0.2 } = {}) {
  const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  gl.setPixelRatio(1);
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#B9B2A5", 1.7));
  const key = new THREE.DirectionalLight("#FFF3E2", 2.3);
  key.position.set(1.6, 6, 2.6); // high: short shadows that stay under the figure
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 16 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#DCE6FF", 1.5);
  rim.position.set(-3, 3.2, -3.5);
  scene.add(rim);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: ombre }));
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);
  const plateau = new THREE.Group();
  scene.add(plateau);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 60);
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
  }
  return { gl, scene, plateau, key, tourner };
}
