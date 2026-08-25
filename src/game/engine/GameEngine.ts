import * as THREE from "three";
import { buildArena, type ArenaData } from "./Arena";
import { InputController, isTouchDevice } from "./InputController";
import { WeaponSystem } from "./WeaponSystem";
import { EnemySystem } from "./EnemySystem";
import { HudStore } from "../hud/HudStore";
import { WEAPON_ORDER, type WeaponId } from "../weapons-data";

const EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;
const WALK_SPEED = 5.2;
const SPRINT_MULT = 1.55;
const GRAVITY = -20;
const JUMP_SPEED = 6.2;
const REGEN_DELAY = 4; // seconds without damage before health starts regenerating
const REGEN_RATE = 14; // hp / second
const WAVE_INTERMISSION = 4; // seconds between waves

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  hud: HudStore;
  ownedWeapons: WeaponId[];
  onReward: (credits: number) => void;
  onRunEnd: (wave: number, kills: number) => void;
}

export class GameEngine {
  readonly isTouch = isTouchDevice();

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private arena: ArenaData;
  private input: InputController;
  private weaponSystem: WeaponSystem;
  private enemySystem: EnemySystem;
  private hud: HudStore;
  private canvas: HTMLCanvasElement;

  private playerPos = new THREE.Vector3(0, 0, 8);
  private playerVelY = 0;
  private yaw = 0;
  private pitch = 0;
  private health = 100;
  private maxHealth = 100;
  private noDamageTimer = 999;
  private running = false;
  private rafId = 0;
  private clock = new THREE.Clock();

  private ownedWeapons: WeaponId[];
  private weaponIndex = 0;

  private wave = 0;
  private kills = 0;
  private intermissionTimer = 0;
  private phase: "idle" | "playing" | "intermission" | "dead" = "idle";

  private onReward: (credits: number) => void;
  private onRunEnd: (wave: number, kills: number) => void;

  private fpsAccum = 0;
  private fpsFrames = 0;
  private fpsTimer = 0;

  constructor(opts: GameEngineOptions) {
    this.canvas = opts.canvas;
    this.hud = opts.hud;
    this.ownedWeapons = opts.ownedWeapons.length
      ? WEAPON_ORDER.filter((w) => opts.ownedWeapons.includes(w))
      : ["pistol"];
    this.onReward = opts.onReward;
    this.onRunEnd = opts.onRunEnd;

    this.scene = new THREE.Scene();

    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.isTouch ? 1.5 : 2);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: pixelRatio < 2,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0c12, 1);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      110
    );

    this.arena = buildArena();
    this.scene.add(this.arena.group);
    this.scene.fog = this.arena.fog;

    this.input = new InputController();
    this.input.attach(this.canvas);

    this.enemySystem = new EnemySystem(this.scene, this.arena.spawnPoints, {
      onPlayerDamage: (amount) => this.damagePlayer(amount),
      onEnemyKilled: (reward) => {
        this.kills += 1;
        this.onReward(reward);
        this.hud.pushKill(`+${reward} — cible neutralisée`);
      },
    });

    this.weaponSystem = new WeaponSystem(
      this.scene,
      this.camera,
      this.hud,
      (origin, dir, range) => this.enemySystem.raycast(origin, dir, range),
      (index, damage) => this.enemySystem.damage(index, damage)
    );
    this.weaponSystem.setWeapon(this.ownedWeapons[0]);

    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.isTouch ? 1.5 : 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  requestPointerLock() {
    if (!this.isTouch) this.input.requestPointerLock();
  }

  startRun(ownedWeapons: WeaponId[]) {
    this.ownedWeapons = WEAPON_ORDER.filter((w) => ownedWeapons.includes(w));
    if (this.ownedWeapons.length === 0) this.ownedWeapons = ["pistol"];
    this.weaponIndex = 0;
    this.weaponSystem.setWeapon(this.ownedWeapons[0]);

    this.playerPos.set(0, 0, 8);
    this.playerVelY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.health = this.maxHealth;
    this.noDamageTimer = 999;
    this.wave = 1;
    this.kills = 0;
    this.phase = "playing";
    this.enemySystem.startWave(this.wave);

    this.hud.set({
      phase: "playing",
      health: this.health,
      maxHealth: this.maxHealth,
      wave: this.wave,
      score: 0,
    });

    if (!this.running) {
      this.running = true;
      this.clock.start();
      this.loop();
    }
  }

  private damagePlayer(amount: number) {
    if (this.phase !== "playing") return;
    this.health = Math.max(0, this.health - amount);
    this.noDamageTimer = 0;
    this.hud.set({
      health: this.health,
      damageFlash: this.hud.getSnapshot().damageFlash + 1,
    });
    if (this.health <= 0) this.die();
  }

  private die() {
    this.phase = "dead";
    this.hud.set({ phase: "dead" });
    document.exitPointerLock();
    this.onRunEnd(this.wave, this.kills);
  }

  private switchWeapon(index: number) {
    if (index < 0 || index >= this.ownedWeapons.length) return;
    this.weaponIndex = index;
    this.weaponSystem.setWeapon(this.ownedWeapons[this.weaponIndex]);
  }

  private cycleWeapon(dir: 1 | -1) {
    const n = this.ownedWeapons.length;
    this.weaponIndex = (this.weaponIndex + dir + n) % n;
    this.weaponSystem.setWeapon(this.ownedWeapons[this.weaponIndex]);
  }

  private resolveObstacleCollisions() {
    for (const obs of this.arena.obstacles) {
      const dx = this.playerPos.x - obs.center.x;
      const dz = this.playerPos.z - obs.center.y;
      const ex = obs.halfExtent.x + PLAYER_RADIUS;
      const ez = obs.halfExtent.y + PLAYER_RADIUS;
      if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
        const overlapX = ex - Math.abs(dx);
        const overlapZ = ez - Math.abs(dz);
        if (overlapX < overlapZ) {
          this.playerPos.x += Math.sign(dx || 1) * overlapX;
        } else {
          this.playerPos.z += Math.sign(dz || 1) * overlapZ;
        }
      }
    }
    const distFromCenter = Math.hypot(this.playerPos.x, this.playerPos.z);
    const maxDist = this.arena.bounds - 1.2;
    if (distFromCenter > maxDist) {
      const scale = maxDist / distFromCenter;
      this.playerPos.x *= scale;
      this.playerPos.z *= scale;
    }
  }

  private loop = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());

    this.fpsAccum += dt;
    this.fpsFrames += 1;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.hud.set({ fps: Math.round(this.fpsFrames / this.fpsAccum) });
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }

    const snap = this.input.poll();

    if (this.phase === "playing" || this.phase === "intermission") {
      this.yaw -= snap.lookDX;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - snap.lookDY,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
      );

      const sprinting = snap.sprint && snap.moveY > 0;
      const speed = WALK_SPEED * (sprinting ? SPRINT_MULT : 1);
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const move = new THREE.Vector3();
      move.addScaledVector(forward, snap.moveY);
      move.addScaledVector(right, snap.moveX);
      if (move.lengthSq() > 1) move.normalize();
      this.playerPos.x += move.x * speed * dt;
      this.playerPos.z += move.z * speed * dt;

      if (snap.jumpPressed && this.playerPos.y <= 0.001) {
        this.playerVelY = JUMP_SPEED;
      }
      this.playerVelY += GRAVITY * dt;
      this.playerPos.y = Math.max(0, this.playerPos.y + this.playerVelY * dt);
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelY = 0;
      }

      this.resolveObstacleCollisions();

      this.camera.position.set(this.playerPos.x, EYE_HEIGHT + this.playerPos.y, this.playerPos.z);
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;

      if (snap.weaponSelect !== null) this.switchWeapon(snap.weaponSelect);
      if (snap.weaponCycle !== null) this.cycleWeapon(snap.weaponCycle);

      this.weaponSystem.update(dt, snap.firing, snap.ads, snap.reloadPressed);

      if (this.phase === "playing") {
        this.enemySystem.update(dt, this.playerPos);

        this.noDamageTimer += dt;
        if (this.noDamageTimer > REGEN_DELAY && this.health < this.maxHealth) {
          this.health = Math.min(this.maxHealth, this.health + REGEN_RATE * dt);
          this.hud.set({ health: Math.round(this.health) });
        }

        this.hud.set({ enemiesRemaining: this.enemySystem.remaining });

        if (this.enemySystem.remaining === 0) {
          this.phase = "intermission";
          this.intermissionTimer = WAVE_INTERMISSION;
          this.hud.set({ phase: "wave-intermission" });
        }
      } else {
        this.enemySystem.update(0, this.playerPos);
        this.intermissionTimer -= dt;
        if (this.intermissionTimer <= 0) {
          this.wave += 1;
          this.enemySystem.startWave(this.wave);
          this.phase = "playing";
          this.hud.set({ phase: "playing", wave: this.wave });
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  getInputController() {
    return this.input;
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.onResize);
    this.input.dispose();
    this.weaponSystem.dispose();
    this.enemySystem.dispose();
    this.renderer.dispose();
  }
}
