import { Injectable, type OnDestroy, signal } from '@angular/core';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { CharacterManager } from '../characters/character-manager';
import type { Character } from '../characters/character';
import { EnvironmentService } from '../environment.service';
import { RendererService } from '../renderer.service';
import { InputService } from './input.service';

const WALK_SPEED = 6;
const RUN_SPEED = 11;
const JUMP_SPEED = 9;
const GRAVITY = -18;

/**
 * Third-person player controller: Rapier dynamic capsule body, WASD/Shift/
 * Space movement relative to the orbit camera, ground following on the terrain
 * height field, and a damped third-person camera. Replaces the debug
 * OrbitControls once the player spawns.
 */
@Injectable({ providedIn: 'root' })
export class PlayerControllerService implements OnDestroy {
  private physics: RAPIER.World | null = null;
  private body: RAPIER.RigidBody | null = null;
  private character: Character | null = null;
  private spawnPosition = new THREE.Vector3(0, 0, 0);
  private grounded = false;
  private justJumped = false;
  private lastAnimation = 'idle';
  /** Live player state for HUD (minimap/compass/interaction). */
  readonly position = signal({ x: 0, y: 0, z: 0 });
  readonly heading = signal(0);
  readonly moving = signal(false);
  private readonly frame = (delta: number, time: number): void => {
    this.step(delta, time);
  };

  constructor(
    private readonly renderer: RendererService,
    private readonly environment: EnvironmentService,
    private readonly characters: CharacterManager,
    private readonly input: InputService,
  ) {}

  get active(): boolean {
    return this.physics !== null;
  }

  /** Spawn the player and hand the camera over from OrbitControls. */
  async spawn(position: THREE.Vector3): Promise<void> {
    if (this.physics) return;
    this.spawnPosition.copy(position);
    await RAPIER.init();
    this.physics = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 });
    this.buildGround();

    const groundY = this.environment.groundHeight(position.x, position.z);
    this.body = this.physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, groundY + 1.6, position.z)
        .lockRotations()
        .setCcdEnabled(true),
    );
    this.physics.createCollider(
      RAPIER.ColliderDesc.capsule(0.9, 0.45).setFriction(0.2).setRestitution(0),
      this.body,
    );

    this.character = await this.characters.load('player', 'IDLE');
    this.character.group.scale.setScalar(1.1);
    this.renderer.scene.add(this.character.group);
    this.character.setAnimation('idle');

    this.renderer.enableCameraControl(false);
    this.renderer.onFrame(this.frame);
    this.input.attach(this.renderer.canvas());
  }

  private buildGround(): void {
    if (!this.physics) return;
    const nrows = 96;
    const ncols = 96;
    const size = 900;
    const heights = new Float32Array(nrows * ncols);
    const cell = size / (ncols - 1);
    for (let i = 0; i < nrows; i++) {
      for (let j = 0; j < ncols; j++) {
        const x = -size / 2 + j * cell;
        const z = -size / 2 + i * cell;
        heights[i * ncols + j] = this.environment.groundHeight(x, z);
      }
    }
    const scale = { x: cell, y: 1, z: cell };
    const collider = RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, scale);
    // Center the heightfield on the world origin.
    collider.setTranslation(
      -size / 2 + cell / 2,
      0,
      -size / 2 + cell / 2,
    );
    this.physics.createCollider(collider);
  }

  private step(delta: number, time: number): void {
    if (!this.physics || !this.body) return;
    const input = this.input.state();
    const body = this.body;

    // --- horizontal movement relative to the orbit camera ---
    const yaw = this.input.orbitYaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    // Camera-relative forward on the ground plane.
    const forward = new THREE.Vector3(sin, 0, cos);
    const right = new THREE.Vector3(cos, 0, -sin);

    const move = new THREE.Vector3();
    if (input.forward) move.add(forward);
    if (input.back) move.sub(forward);
    if (input.right) move.add(right);
    if (input.left) move.sub(right);
    if (move.lengthSq() > 0) move.normalize();

    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    const vel = body.linvel();
    const grounded = this.isGrounded();

    let vy = vel.y;
    if (grounded && input.jump && !this.justJumped) {
      vy = JUMP_SPEED;
      this.justJumped = true;
    } else if (!input.jump) {
      this.justJumped = false;
    }

    body.setLinvel(
      {
        x: move.x * speed,
        y: vy,
        z: move.z * speed,
      },
      true,
    );

    // --- apply physics ---
    this.physics.timestep = Math.min(delta, 0.033);
    this.physics.step();

    // --- ground clamp (heightfield belt-and-suspenders) ---
    const pos = body.translation();
    const ground = this.environment.groundHeight(pos.x, pos.z);
    const bodyY = pos.y;
    const footY = bodyY - 1.05;
    if (footY < ground + 0.05) {
      body.setTranslation({ x: pos.x, y: ground + 1.05, z: pos.z }, true);
    }

    // --- drive the character mesh + camera ---
    this.syncCharacter(move, grounded, time);
    this.updateCamera(delta);
    this.renderer.camera.updateProjectionMatrix();
  }

  private isGrounded(): boolean {
    if (!this.body) return false;
    const pos = this.body.translation();
    const ground = this.environment.groundHeight(pos.x, pos.z);
    this.grounded = pos.y - 1.05 <= ground + 0.12;
    return this.grounded;
  }

  private syncCharacter(
    move: THREE.Vector3,
    grounded: boolean,
    _time: number,
  ): void {
    if (!this.body || !this.character) return;
    const pos = this.body.translation();
    this.position.set({ x: pos.x, y: pos.y, z: pos.z });
    this.character.group.position.set(pos.x, pos.y, pos.z);
    if (move.lengthSq() > 0.01) {
      const heading = Math.atan2(move.x, move.z);
      this.character.group.rotation.y = heading;
      this.heading.set(heading);
    }
    this.moving.set(move.lengthSq() > 0.01 && grounded);
    const anim = grounded ? (move.lengthSq() > 0.01 ? 'walk' : 'idle') : 'walk';
    if (anim !== this.lastAnimation) {
      this.lastAnimation = anim;
      this.character.setAnimation(anim);
    }
  }

  private updateCamera(delta: number): void {
    if (!this.body) return;
    const pos = this.body.translation();
    const yaw = this.input.orbitYaw;
    const pitch = this.input.orbitPitch;
    const dist = this.input.orbitDistance;

    const target = new THREE.Vector3(pos.x, pos.y + 1.4, pos.z);
    const dir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    const desired = target.clone().add(dir.multiplyScalar(dist));
    this.renderer.camera.position.lerp(desired, Math.min(1, delta * 8));
    this.renderer.camera.lookAt(target);
  }

  ngOnDestroy(): void {
    if (this.physics) {
      this.renderer.offFrame(this.frame);
      this.character?.dispose();
      this.renderer.enableCameraControl(true);
      this.physics.free();
      this.physics = null;
      this.body = null;
    }
  }
}