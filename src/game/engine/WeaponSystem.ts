import * as THREE from "three";
import { WEAPONS, type WeaponDef, type WeaponId } from "../weapons-data";
import type { HudStore } from "../hud/HudStore";

export interface RaycastEnemyHit {
  index: number;
  distance: number;
  point: THREE.Vector3;
}

export type EnemyRaycaster = (
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxRange: number
) => RaycastEnemyHit | null;

export type OnEnemyHit = (index: number, damage: number, point: THREE.Vector3) => void;

const BASE_FOV = 70;

/** Owns the current weapon's state machine (fire/reload/ADS), the first-person
 * viewmodel mesh, and lightweight hit-scan visuals (muzzle flash + tracers). */
export class WeaponSystem {
  private camera: THREE.PerspectiveCamera;
  private hud: HudStore;
  private raycastEnemies: EnemyRaycaster;
  private onEnemyHit: OnEnemyHit;

  weaponId: WeaponId = "pistol";
  private ammoInMag = 0;
  private reloading = false;
  private reloadTimer = 0;
  private fireTimer = 0;
  private recoilKick = 0;
  private bobPhase = 0;
  private targetFov = BASE_FOV;

  private viewmodel: THREE.Group;
  private gunMesh: THREE.Group;
  private muzzleFlash: THREE.Mesh;
  private muzzleTimer = 0;
  private tracers: { mesh: THREE.Line; life: number }[] = [];
  private tracerGroup: THREE.Group;
  private prevFiring = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    hud: HudStore,
    raycastEnemies: EnemyRaycaster,
    onEnemyHit: OnEnemyHit
  ) {
    this.camera = camera;
    this.hud = hud;
    this.raycastEnemies = raycastEnemies;
    this.onEnemyHit = onEnemyHit;

    this.viewmodel = new THREE.Group();
    this.viewmodel.position.set(0.32, -0.28, -0.55);
    camera.add(this.viewmodel);

    this.gunMesh = new THREE.Group();
    this.viewmodel.add(this.gunMesh);

    const flashGeo = new THREE.ConeGeometry(0.06, 0.16, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.rotation.x = -Math.PI / 2;
    this.muzzleFlash.visible = false;
    this.viewmodel.add(this.muzzleFlash);

    this.tracerGroup = new THREE.Group();
    scene.add(this.tracerGroup);

    this.setWeapon("pistol");
  }

  private rebuildGunMesh(def: WeaponDef) {
    this.gunMesh.clear();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), bodyMat);
    this.gunMesh.add(body);

    const barrelLen = 0.2 + def.range / 220;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, barrelLen, 8),
      accentMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.3 - barrelLen / 2);
    this.gunMesh.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.08), bodyMat);
    grip.position.set(0, -0.13, 0.15);
    grip.rotation.x = 0.3;
    this.gunMesh.add(grip);

    if (def.pelletCount > 1) {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.22), bodyMat);
      stock.position.set(0, -0.02, 0.35);
      this.gunMesh.add(stock);
    }
    if (def.id === "sniper") {
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), accentMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.08, -0.05);
      this.gunMesh.add(scope);
    }

    this.muzzleFlash.position.set(0, 0.02, -0.3 - barrelLen);
    (this.muzzleFlash.material as THREE.MeshBasicMaterial).color.setHex(0xfff2c0);
  }

  setWeapon(id: WeaponId) {
    const def = WEAPONS[id];
    this.weaponId = id;
    this.ammoInMag = def.magSize;
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.rebuildGunMesh(def);
    this.pushHud();
  }

  private pushHud() {
    this.hud.set({
      weaponId: this.weaponId,
      ammoInMag: this.ammoInMag,
      magSize: WEAPONS[this.weaponId].magSize,
      reloading: this.reloading,
    });
  }

  private startReload() {
    const def = WEAPONS[this.weaponId];
    if (this.reloading || this.ammoInMag === def.magSize) return;
    this.reloading = true;
    this.reloadTimer = def.reloadMs;
    this.pushHud();
  }

  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    if (this.tracers.length > 12) {
      const old = this.tracers.shift();
      if (old) this.tracerGroup.remove(old.mesh);
    }
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    this.tracerGroup.add(line);
    this.tracers.push({ mesh: line, life: 0.06 });
  }

  private fireOnce() {
    const def = WEAPONS[this.weaponId];
    if (this.ammoInMag <= 0) {
      this.startReload();
      return;
    }
    this.ammoInMag -= 1;
    this.fireTimer = def.fireRateMs;
    this.recoilKick = Math.min(1, this.recoilKick + 0.5);
    this.muzzleFlash.visible = true;
    this.muzzleTimer = 0.045;

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    const spread = this.hud.getSnapshot().ads ? def.spread * def.adsSpreadMult : def.spread;
    let anyHit = false;

    for (let p = 0; p < def.pelletCount; p++) {
      const dir = forward.clone();
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread * 2;
      dir.normalize();

      const hit = this.raycastEnemies(origin, dir, def.range);
      const end = hit ? hit.point : origin.clone().add(dir.clone().multiplyScalar(def.range));
      this.spawnTracer(origin.clone().add(dir.clone().multiplyScalar(0.6)), end, def.color);

      if (hit) {
        anyHit = true;
        this.onEnemyHit(hit.index, def.damage, hit.point);
      }
    }

    if (anyHit) this.hud.set({ hitMarker: this.hud.getSnapshot().hitMarker + 1 });
    this.pushHud();
  }

  update(dt: number, firing: boolean, ads: boolean, reloadPressed: boolean) {
    const def = WEAPONS[this.weaponId];
    const firingEdge = firing && !this.prevFiring;
    this.prevFiring = firing;

    if (this.fireTimer > 0) this.fireTimer -= dt * 1000;
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) this.muzzleFlash.visible = false;
    }

    if (this.reloading) {
      this.reloadTimer -= dt * 1000;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammoInMag = def.magSize;
        this.pushHud();
      }
    } else if (reloadPressed) {
      this.startReload();
    } else if (this.fireTimer <= 0 && ((def.auto && firing) || (!def.auto && firingEdge))) {
      this.fireOnce();
    }

    // ADS zoom + weapon lower
    this.targetFov = ads && !this.reloading ? BASE_FOV * def.adsFov : BASE_FOV;
    this.camera.fov += (this.targetFov - this.camera.fov) * Math.min(1, dt * 10);
    this.camera.updateProjectionMatrix();
    this.hud.set({ ads: ads && !this.reloading });

    // viewmodel bob + recoil feedback, purely cosmetic
    this.recoilKick = Math.max(0, this.recoilKick - dt * 4);
    const adsLerp = ads ? 1 : 0;
    this.viewmodel.position.x += ((ads ? 0.06 : 0.32) - this.viewmodel.position.x) * dt * 12;
    this.viewmodel.position.y += ((ads ? -0.22 : -0.28) - this.viewmodel.position.y) * dt * 12;
    this.bobPhase += dt * (firing ? 14 : 6);
    const bob = Math.sin(this.bobPhase) * 0.006 * (1 - adsLerp * 0.7);
    this.gunMesh.position.y = bob + this.recoilKick * 0.03;
    this.gunMesh.position.z = this.recoilKick * 0.06;
    this.gunMesh.rotation.x = -this.recoilKick * 0.15;

    // tracer fade
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      (t.mesh.material as THREE.LineBasicMaterial).opacity = Math.max(0, t.life / 0.06);
      if (t.life <= 0) {
        this.tracerGroup.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }

  dispose() {
    this.viewmodel.removeFromParent();
    this.tracerGroup.removeFromParent();
  }
}
