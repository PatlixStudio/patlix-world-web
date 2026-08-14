import * as THREE from 'three';
import type { Character, CharacterAnimation } from './character';

type LimbKey = 'armL' | 'armR' | 'legL' | 'legR';

interface Limb {
  key: LimbKey;
  mesh: THREE.Mesh;
  swing: number;
  phase: number;
}

/**
 * Procedural humanoid rig used as the built-in placeholder character (until
 * Mixamo GLBs are dropped into `public/assets/characters/`). Simple IK-free
 * limb animation: breathing for idle, limb swings for walk, arm motions for
 * work, slouch for blocked.
 */
export class ProceduralCharacter implements Character {
  readonly group = new THREE.Group();
  private readonly limbs = new Map<LimbKey, Limb>();
  private readonly torso: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private animation: CharacterAnimation = 'idle';

  constructor(color = 0x7fb5ec) {
    this.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
    });

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.7, 4, 10),
      this.material,
    );
    torso.position.y = 1.5;
    torso.castShadow = true;
    this.torso = torso;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 18, 18),
      this.material,
    );
    head.position.y = 2.15;
    head.castShadow = true;
    this.head = head;

    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.34, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x20303f, roughness: 0.9 }),
    );
    hat.position.y = 2.4;

    const armL = this.buildLimb('armL', 0.13, 0.85, -0.55, 1.62, 0.5, 0);
    const armR = this.buildLimb('armR', 0.13, 0.85, 0.55, 1.62, 0.5, Math.PI);
    const legL = this.buildLimb('legL', 0.16, 0.9, -0.24, 1.05, 0.6, 0);
    const legR = this.buildLimb('legR', 0.16, 0.9, 0.24, 1.05, 0.6, Math.PI);

    this.group.add(torso, head, hat, armL.mesh, armR.mesh, legL.mesh, legR.mesh);
  }

  private buildLimb(
    key: LimbKey,
    radius: number,
    length: number,
    offsetX: number,
    pivotY: number,
    swing: number,
    phase: number,
  ): Limb {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, length, 4, 8),
      this.material,
    );
    mesh.position.set(offsetX, pivotY - length / 2, 0);
    mesh.castShadow = true;
    const limb: Limb = { key, mesh, swing, phase };
    this.limbs.set(key, limb);
    return limb;
  }

  setColor(color: number): void {
    this.material.color.setHex(color);
  }

  setAnimation(animation: CharacterAnimation): void {
    this.animation = animation;
  }

  update(delta: number, time: number): void {
    const t = time;
    const legL = this.limbs.get('legL');
    const legR = this.limbs.get('legR');
    const armL = this.limbs.get('armL');
    const armR = this.limbs.get('armR');

    switch (this.animation) {
      case 'idle': {
        const breathe = Math.sin(t * 2) * 0.03;
        this.torso.rotation.x = breathe;
        this.head.rotation.x = breathe * 0.6;
        this.torso.position.y = 1.5 + Math.sin(t * 2) * 0.01;
        if (armL) armL.mesh.rotation.x = -0.06 + Math.sin(t * 1.4) * 0.04;
        if (armR) armR.mesh.rotation.x = -0.06 - Math.sin(t * 1.4) * 0.04;
        if (legL) legL.mesh.rotation.x = 0;
        if (legR) legR.mesh.rotation.x = 0;
        break;
      }
      case 'walk': {
        const swing = Math.sin(t * 7);
        if (legL) legL.mesh.rotation.x = swing * 0.55;
        if (legR) legR.mesh.rotation.x = -swing * 0.55;
        if (armL) armL.mesh.rotation.x = -swing * 0.4;
        if (armR) armR.mesh.rotation.x = swing * 0.4;
        this.torso.rotation.x = Math.sin(t * 14) * 0.02;
        this.group.position.y += Math.abs(Math.cos(t * 7)) * delta * 0.35;
        break;
      }
      case 'work': {
        const typing = Math.sin(t * 11) * 0.22;
        if (armR) armR.mesh.rotation.x = -1.25 + typing;
        if (armL) armL.mesh.rotation.x = -1.2 - typing;
        this.torso.rotation.x = 0.08;
        this.head.rotation.x = -0.05;
        break;
      }
      case 'blocked': {
        this.torso.rotation.x = 0.16;
        this.head.rotation.x = 0.25;
        this.torso.position.y = 1.44;
        if (armL) armL.mesh.rotation.x = 0.12;
        if (armR) armR.mesh.rotation.x = 0.12;
        break;
      }
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.material.dispose();
  }
}