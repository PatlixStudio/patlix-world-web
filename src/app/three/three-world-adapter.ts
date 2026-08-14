import { Injectable, type OnDestroy } from '@angular/core';
import * as THREE from 'three';
import type { AgentDto, TaskDto, ZoneDto } from '@patlixworld/shared';
import type { WorldAdapter } from '../core/world-adapter';
import { EnvironmentService } from './environment.service';
import { RendererService } from './renderer.service';

const STATUS_COLOR: Record<string, number> = {
  IDLE: 0x7fb5ec,
  ASSIGNED: 0xffd278,
  WORKING: 0xffaa5a,
  WAITING: 0xc9a0ff,
  NAVIGATING: 0x5fcfcf,
  MEETING: 0xff9ac0,
  COMMUNICATING: 0xffd278,
  BLOCKED: 0xff6e64,
  OFFLINE: 0x778899,
  CREATED: 0x9fb2c4,
};

/**
 * Three.js implementation of the WorldAdapter contract: mirrors store state
 * into the scene. Agents are capsule placeholders (proper rigged characters
 * arrive in M6) colored by status, labeled, and positioned from backend state.
 */
@Injectable({ providedIn: 'root' })
export class ThreeWorldAdapter implements WorldAdapter, OnDestroy {
  private readonly agents = new Map<
    string,
    { group: THREE.Group; capsule: THREE.Mesh; label: THREE.Sprite }
  >();
  private readonly frame = (delta: number, time: number): void => {
    for (const { group } of this.agents.values()) {
      group.position.y += Math.sin(time * 1.8 + group.position.x) * delta * 0.4;
    }
  };
  private zonesBuilt = false;

  constructor(
    private readonly renderer: RendererService,
    private readonly environment: EnvironmentService,
  ) {
    this.renderer.onFrame(this.frame);
  }

  setZones(zones: ZoneDto[]): void {
    if (this.zonesBuilt) return;
    this.environment.build(zones);
    this.zonesBuilt = true;
  }

  setAgents(agents: AgentDto[]): void {
    const seen = new Set<string>();
    for (const agent of agents) {
      seen.add(agent.id);
      const existing = this.agents.get(agent.id);
      if (existing) {
        this.updateMesh(existing, agent);
      } else {
        this.agents.set(agent.id, this.createMesh(agent));
      }
    }
    for (const [id, entry] of this.agents) {
      if (!seen.has(id)) {
        this.renderer.scene.remove(entry.group);
        this.agents.delete(id);
      }
    }
  }

  setTasks(_tasks: TaskDto[]): void {
    // Task state is reflected through agent status/activity; no scene change.
  }

  private createMesh(agent: AgentDto): {
    group: THREE.Group;
    capsule: THREE.Mesh;
    label: THREE.Sprite;
  } {
    const color = STATUS_COLOR[agent.status] ?? 0x7fb5ec;
    const group = new THREE.Group();
    group.name = agent.name;
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.75, 1.4, 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    capsule.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.15, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    const label = this.environment.makeLabel(agent.name, 1.2);
    label.position.y = 3.4;

    group.add(capsule, ring, label);
    this.renderer.scene.add(group);
    this.updateMesh({ group, capsule, label }, agent);
    return { group, capsule, label };
  }

  private updateMesh(
    entry: { group: THREE.Group; capsule: THREE.Mesh; label: THREE.Sprite },
    agent: AgentDto,
  ): void {
    const { x, y, z } = agent.location;
    const ground = this.environment.groundHeight(x, z);
    entry.group.position.set(x, ground + y + 1.05, z);
    entry.group.rotation.y = agent.location.heading;
    const material = entry.capsule.material as THREE.MeshStandardMaterial;
    material.color.setHex(STATUS_COLOR[agent.status] ?? 0x7fb5ec);
    entry.label.material.opacity = 0.95;
  }

  ngOnDestroy(): void {
    this.renderer.offFrame(this.frame);
  }
}