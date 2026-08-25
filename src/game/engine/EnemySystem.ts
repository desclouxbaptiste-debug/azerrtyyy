import * as THREE from "three";
import type { RaycastEnemyHit } from "./WeaponSystem";

type EnemyType = "grunt" | "heavy";

interface EnemyTypeDef {
  hp: number;
  speed: number;
  radius: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  reward: number;
  color: number;
  headScale: number; // fraction of body height used for the head, for crit checks
  bodyHeight: number;
}

const TYPES: Record<EnemyType, EnemyTypeDef> = {
  grunt: {
    hp: 60,
    speed: 3.4,
    radius: 0.45,
    attackRange: 12,
    attackDamage: 6,
    attackCooldown: 1.1,
    reward: 12,
    color: 0xff5a5a,
    headScale: 0.82,
    bodyHeight: 1.8,
  },
  heavy: {
    hp: 160,
    speed: 2.1,
    radius: 0.6,
    attackRange: 9,
    attackDamage: 14,
    attackCooldown: 1.6,
    reward: 30,
    color: 0xa06bff,
    headScale: 0.86,
    bodyHeight: 2.2,
  },
};

interface EnemySlot {
  alive: boolean;
  type: EnemyType;
  hp: number;
  maxHp: number;
  pos: THREE.Vector3;
  attackTimer: number;
  deathTimer: number;
  flashTimer: number;
}

export interface EnemySystemCallbacks {
  onPlayerDamage: (amount: number) => void;
  onEnemyKilled: (reward: number, wasCrit: boolean) => void;
}

const CAPACITY = 48;

export class EnemySystem {
  private slots: EnemySlot[] = [];
  private bodyMesh: THREE.InstancedMesh;
  private headMesh: THREE.InstancedMesh;
  private tmpMatrix = new THREE.Matrix4();
  private tmpColor = new THREE.Color();
  private callbacks: EnemySystemCallbacks;
  private spawnPoints: THREE.Vector3[];

  private spawnQueue: { type: EnemyType; delay: number }[] = [];
  private aliveCount = 0;
  wave = 0;

  constructor(scene: THREE.Scene, spawnPoints: THREE.Vector3[], callbacks: EnemySystemCallbacks) {
    this.spawnPoints = spawnPoints;
    this.callbacks = callbacks;

    const bodyGeo = new THREE.CapsuleGeometry(0.42, 1.1, 2, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    this.bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, CAPACITY);
    this.bodyMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(CAPACITY * 3),
      3
    );
    this.bodyMesh.frustumCulled = false;
    scene.add(this.bodyMesh);

    const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
    this.headMesh = new THREE.InstancedMesh(headGeo, headMat, CAPACITY);
    this.headMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(CAPACITY * 3),
      3
    );
    this.headMesh.frustumCulled = false;
    scene.add(this.headMesh);

    for (let i = 0; i < CAPACITY; i++) {
      this.slots.push({
        alive: false,
        type: "grunt",
        hp: 0,
        maxHp: 0,
        pos: new THREE.Vector3(0, -100, 0),
        attackTimer: 0,
        deathTimer: 0,
        flashTimer: 0,
      });
      this.hideInstance(i);
    }
  }

  private hideInstance(i: number) {
    this.tmpMatrix.makeScale(0.0001, 0.0001, 0.0001);
    this.bodyMesh.setMatrixAt(i, this.tmpMatrix);
    this.headMesh.setMatrixAt(i, this.tmpMatrix);
  }

  get remaining() {
    return this.aliveCount + this.spawnQueue.length;
  }

  startWave(waveNumber: number) {
    this.wave = waveNumber;
    const total = 4 + Math.floor(waveNumber * 2.2);
    const heavyChance = Math.min(0.35, waveNumber * 0.04);
    this.spawnQueue = [];
    for (let i = 0; i < total; i++) {
      const type: EnemyType = Math.random() < heavyChance ? "heavy" : "grunt";
      this.spawnQueue.push({ type, delay: i * 0.7 });
    }
  }

  private spawnOne(type: EnemyType) {
    const idx = this.slots.findIndex((s) => !s.alive);
    if (idx === -1) return;
    const def = TYPES[type];
    const sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    const slot = this.slots[idx];
    slot.alive = true;
    slot.type = type;
    slot.hp = def.hp;
    slot.maxHp = def.hp;
    slot.pos.set(sp.x, def.bodyHeight / 2, sp.z);
    slot.attackTimer = def.attackCooldown * 0.5;
    slot.deathTimer = 0;
    slot.flashTimer = 0;
    this.aliveCount++;
    this.tmpColor.setHex(def.color);
    this.bodyMesh.setColorAt(idx, this.tmpColor);
    this.headMesh.setColorAt(idx, this.tmpColor);
  }

  update(dt: number, playerPos: THREE.Vector3) {
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      this.spawnQueue[i].delay -= dt;
      if (this.spawnQueue[i].delay <= 0) {
        this.spawnOne(this.spawnQueue[i].type);
        this.spawnQueue.splice(i, 1);
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.alive) {
        if (s.deathTimer > 0) {
          s.deathTimer -= dt;
          const scale = Math.max(0.0001, s.deathTimer / 0.25);
          this.tmpMatrix.compose(
            s.pos,
            new THREE.Quaternion(),
            new THREE.Vector3(scale, scale, scale)
          );
          this.bodyMesh.setMatrixAt(i, this.tmpMatrix);
          this.headMesh.setMatrixAt(i, this.tmpMatrix);
          if (s.deathTimer <= 0) this.hideInstance(i);
        }
        continue;
      }

      const def = TYPES[s.type];
      const toPlayer = new THREE.Vector3(
        playerPos.x - s.pos.x,
        0,
        playerPos.z - s.pos.z
      );
      const dist = toPlayer.length();

      if (dist > def.attackRange * 0.85) {
        toPlayer.normalize();
        s.pos.x += toPlayer.x * def.speed * dt;
        s.pos.z += toPlayer.z * def.speed * dt;
      } else {
        s.attackTimer -= dt;
        if (s.attackTimer <= 0) {
          s.attackTimer = def.attackCooldown;
          this.callbacks.onPlayerDamage(def.attackDamage);
        }
      }

      if (s.flashTimer > 0) {
        s.flashTimer -= dt;
        if (s.flashTimer <= 0) {
          this.tmpColor.setHex(def.color);
          this.bodyMesh.setColorAt(i, this.tmpColor);
          this.headMesh.setColorAt(i, this.tmpColor);
        }
      }

      const bob = Math.sin(performance.now() * 0.006 + i) * 0.05;
      const bodyPos = new THREE.Vector3(s.pos.x, def.bodyHeight / 2 + bob, s.pos.z);
      this.tmpMatrix.compose(bodyPos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      this.bodyMesh.setMatrixAt(i, this.tmpMatrix);

      const headPos = new THREE.Vector3(
        s.pos.x,
        def.bodyHeight * def.headScale + bob,
        s.pos.z
      );
      this.tmpMatrix.compose(headPos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      this.headMesh.setMatrixAt(i, this.tmpMatrix);
    }

    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
    if (this.bodyMesh.instanceColor) this.bodyMesh.instanceColor.needsUpdate = true;
    if (this.headMesh.instanceColor) this.headMesh.instanceColor.needsUpdate = true;
  }

  /** Hitscan test approximating each enemy as a vertical capsule: the ray only
   * needs to pass within `radius` of the enemy's (x,z) position somewhere
   * between the ground and head height — it doesn't need to be level with the
   * torso. A pure 3D sphere-around-the-torso test would force pixel-perfect
   * vertical aim, which reads as broken hit detection to a player. */
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxRange: number): RaycastEnemyHit | null {
    let best: RaycastEnemyHit | null = null;
    let bestT = maxRange;

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.alive) continue;
      const def = TYPES[s.type];

      const horizLenSq = direction.x * direction.x + direction.z * direction.z;
      if (horizLenSq < 1e-6) continue;

      const dx = s.pos.x - origin.x;
      const dz = s.pos.z - origin.z;
      const t = THREE.MathUtils.clamp(
        (dx * direction.x + dz * direction.z) / horizLenSq,
        0,
        maxRange
      );

      const closeX = origin.x + direction.x * t;
      const closeZ = origin.z + direction.z * t;
      const horizDistSq = (closeX - s.pos.x) ** 2 + (closeZ - s.pos.z) ** 2;
      const radius = def.radius + 0.3;
      if (horizDistSq > radius * radius) continue;

      const rayY = origin.y + direction.y * t;
      if (rayY < -0.2 || rayY > def.bodyHeight + 0.5) continue;

      if (t < bestT) {
        bestT = t;
        best = { index: i, distance: t, point: new THREE.Vector3(closeX, rayY, closeZ) };
      }
    }
    return best;
  }

  damage(index: number, amount: number) {
    const s = this.slots[index];
    if (!s || !s.alive) return;
    const def = TYPES[s.type];
    s.hp -= amount;
    s.flashTimer = 0.08;
    this.tmpColor.setRGB(1, 1, 1);
    this.bodyMesh.setColorAt(index, this.tmpColor);
    this.headMesh.setColorAt(index, this.tmpColor);

    if (s.hp <= 0) {
      s.alive = false;
      s.deathTimer = 0.25;
      this.aliveCount--;
      this.callbacks.onEnemyKilled(def.reward, false);
    }
  }

  dispose() {
    this.bodyMesh.removeFromParent();
    this.headMesh.removeFromParent();
    this.bodyMesh.geometry.dispose();
    this.headMesh.geometry.dispose();
    (this.bodyMesh.material as THREE.Material).dispose();
    (this.headMesh.material as THREE.Material).dispose();
  }
}
