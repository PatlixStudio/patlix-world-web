import { Injectable, type OnDestroy } from '@angular/core';
import * as THREE from 'three';
import type { AgentDto, TaskDto, ZoneDto } from '@patlixworld/shared';
import type { WorldAdapter } from '../core/world-adapter';
import type { Character, CharacterAnimation } from './characters/character';
import { animationForStatus } from './characters/character';
import { CharacterManager } from './characters/character-manager';
import { EnvironmentService } from './environment.service';
import { RendererService } from './renderer.service';

interface AgentEntry {
  group: THREE.Group;
  label: THREE.Sprite;
  character: Character | null;
  pending: Promise<void> | null;
  anim: CharacterAnimation;
  heading: number;
  travelTarget: THREE.Vector3 | null;
  travelSpeed: number;
}

/**
 * Three.js implementation of the WorldAdapter contract: mirrors store state
 * into the scene using rigged characters (Mixamo GLB when present, procedural
 * placeholder otherwise) positioned from backend state and animated by agent
 * status.
 */
@Injectable({ providedIn: 'root' })
export class ThreeWorldAdapter implements WorldAdapter, OnDestroy {
  private readonly agents = new Map<string, AgentEntry>();
  private zonesBuilt = false;

  private readonly frame = (delta: number, time: number): void => {
    for (const entry of this.agents.values()) {
      this.travel(entry, delta);
      entry.character?.update(delta, time);
      entry.group.rotation.y = entry.heading;
    }
  };

  constructor(
    private readonly renderer: RendererService,
    private readonly environment: EnvironmentService,
    private readonly characters: CharacterManager,
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
      const entry = this.agents.get(agent.id);
      if (entry) {
        this.updateEntry(entry, agent);
      } else {
        this.agents.set(agent.id, this.createEntry(agent));
      }
    }
    for (const [id, entry] of this.agents) {
      if (!seen.has(id)) {
        entry.character?.dispose();
        this.renderer.scene.remove(entry.group);
        this.agents.delete(id);
      }
    }
  }

  setTasks(_tasks: TaskDto[]): void {
    // Task state is reflected through agent status/activity; no scene change.
  }

  private createEntry(agent: AgentDto): AgentEntry {
    const group = new THREE.Group();
    group.name = agent.name;
    const label = this.environment.makeLabel(agent.name, 1.2);
    label.position.y = 3.6;
    group.add(label);
    this.renderer.scene.add(group);

    const anim = animationForStatus(agent.status);
    const entry: AgentEntry = {
      group,
      label,
      character: null,
      pending: null,
      anim,
      heading: agent.location.heading,
      travelTarget: null,
      travelSpeed: 3.2,
    };
    this.positionEntry(entry, agent);
    this.animateEntry(entry, agent);

    entry.pending = this.characters.load(agent.name, agent.status).then(
      (character) => {
        entry.character = character;
        entry.group.add(character.group);
        character.setAnimation(entry.anim);
        entry.pending = null;
      },
      () => {
        entry.pending = null;
      },
    );
    return entry;
  }

  private updateEntry(entry: AgentEntry, agent: AgentDto): void {
    this.positionEntry(entry, agent);
    this.animateEntry(entry, agent);
    entry.heading = agent.location.heading;
  }

  private positionEntry(entry: AgentEntry, agent: AgentDto): void {
    const { x, y, z } = agent.location;
    const ground = this.environment.groundHeight(x, z);
    entry.group.position.set(x, ground + y + 1.05, z);
    // Agents set to travel animate a walk toward their destination.
    if (agent.status === 'NAVIGATING' || agent.status === 'ASSIGNED') {
      entry.travelTarget = new THREE.Vector3(x, ground + y + 1.05, z);
    } else {
      entry.travelTarget = null;
    }
  }

  /** Smooth waypoint travel for NAVIGATING/ASSIGNED agents. */
  private travel(entry: AgentEntry, delta: number): void {
    const target = entry.travelTarget;
    if (!target) return;
    const pos = entry.group.position;
    const toTarget = target.clone().sub(pos);
    const dist = toTarget.length();
    if (dist < 0.05) {
      entry.travelTarget = null;
      return;
    }
    const step = entry.travelSpeed * delta;
    if (step >= dist) {
      pos.copy(target);
      entry.travelTarget = null;
      return;
    }
    toTarget.normalize().multiplyScalar(step);
    pos.add(toTarget);
    entry.heading = Math.atan2(toTarget.x, toTarget.z);
    if (entry.character && entry.anim !== 'walk') {
      entry.anim = 'walk';
      entry.character.setAnimation('walk');
    }
  }

  private animateEntry(entry: AgentEntry, agent: AgentDto): void {
    const anim = animationForStatus(agent.status);
    if (anim !== entry.anim) {
      entry.anim = anim;
      entry.character?.setAnimation(anim);
    }
  }

  ngOnDestroy(): void {
    this.renderer.offFrame(this.frame);
    for (const entry of this.agents.values()) {
      entry.character?.dispose();
    }
  }
}