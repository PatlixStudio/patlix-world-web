import { Injectable, computed, signal } from '@angular/core';
import * as THREE from 'three';
import type { AgentDto } from '@patlixworld/shared';
import { WorldStateStore } from '../core/world-state.store';
import { RendererService } from './renderer.service';

export interface InteractionTarget {
  agent: AgentDto;
  distance: number;
}

/**
 * Proximity interaction: raycasts from the camera through the screen centre to
 * find the nearest agent in front of the player, exposing a contextual prompt
 * (`[E] Inspect`). Pressing E selects the agent in the store (inspector).
 */
@Injectable({ providedIn: 'root' })
export class InteractionService {
  readonly target = signal<InteractionTarget | null>(null);
  readonly prompt = computed(() => {
    const t = this.target();
    return t ? `[E] Inspect ${t.agent.name}` : null;
  });
  private readonly raycaster = new THREE.Raycaster();
  private readonly maxDistance = 6;

  constructor(
    private readonly renderer: RendererService,
    private readonly store: WorldStateStore,
  ) {
    this.renderer.onFrame((delta, time) => this.update(delta, time));
  }

  /** Recompute the interaction target each frame. */
  update(delta: number, _time: number): void {
    const agents = this.store.agents();
    if (agents.length === 0) return;
    const camera = this.renderer.camera;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    let nearest: InteractionTarget | null = null;
    for (const agent of agents) {
      const worldPos = this.renderer.scene.getObjectByName(agent.name);
      if (!worldPos) continue;
      const point = new THREE.Vector3();
      worldPos.getWorldPosition(point);
      const dist = camera.position.distanceTo(point);
      if (dist > this.maxDistance) continue;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const toAgent = point.clone().sub(camera.position).normalize();
      const dot = forward.dot(toAgent);
      if (dot < 0.85) continue;
      if (!nearest || dist < nearest.distance) {
        nearest = { agent, distance: dist };
      }
    }
    this.target.set(nearest);
  }

  /** Player pressed E: select the current target for inspection. */
  inspect(): void {
    const t = this.target();
    if (t) {
      this.store.selectAgent(t.agent.id);
    }
  }

  clear(): void {
    this.target.set(null);
  }
}