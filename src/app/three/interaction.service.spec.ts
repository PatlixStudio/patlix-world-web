import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { AgentStatus, type AgentDto } from '@patlixworld/shared';
import { InteractionService } from './interaction.service';
import { RendererService } from './renderer.service';
import { WorldStateStore } from '../core/world-state.store';

function agent(id: string, name: string): AgentDto {
  return {
    id,
    name,
    role: 'ENGINEER',
    persona: 'test agent',
    status: AgentStatus.WORKING,
    model: { provider: 'test', model: 'test' },
    location: { zoneId: 'beach', x: 0, y: 0, z: 0, heading: 0 },
    currentTaskId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('InteractionService', () => {
  let service: InteractionService;
  let store: WorldStateStore;
  let renderer: RendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InteractionService, RendererService, WorldStateStore],
    });
    service = TestBed.inject(InteractionService);
    store = TestBed.inject(WorldStateStore);
    renderer = TestBed.inject(RendererService);
  });

  it('detects the agent in front of the camera and exposes a prompt', () => {
    const walker = agent('a1', 'Walker');
    store.setSnapshot({
      zones: [],
      agents: [walker],
      companies: [],
      properties: [],
      projects: [],
      tasks: [],
    });

    const group = new THREE.Group();
    group.name = 'Walker';
    group.position.set(0, 1, 0);
    renderer.scene.add(group);

    renderer.camera.position.set(0, 3, 4);
    renderer.camera.lookAt(0, 1, 0);
    service.update(0, 0);

    expect(service.prompt()).toBe('[E] Inspect Walker');
  });

  it('ignores distant agents outside interact range', () => {
    const walker = agent('a1', 'Far');
    store.setSnapshot({
      zones: [],
      agents: [walker],
      companies: [],
      properties: [],
      projects: [],
      tasks: [],
    });

    const group = new THREE.Group();
    group.name = 'Far';
    group.position.set(0, 1, 30);
    renderer.scene.add(group);

    renderer.camera.position.set(0, 3, 0);
    renderer.camera.lookAt(0, 1, 30);
    service.update(0, 0);

    expect(service.prompt()).toBeNull();
  });

  it('selects the target agent on inspect', () => {
    const walker = agent('a1', 'Walker');
    store.setSnapshot({
      zones: [],
      agents: [walker],
      companies: [],
      properties: [],
      projects: [],
      tasks: [],
    });

    const group = new THREE.Group();
    group.name = 'Walker';
    group.position.set(0, 1, 0);
    renderer.scene.add(group);

    renderer.camera.position.set(0, 3, 4);
    renderer.camera.lookAt(0, 1, 0);
    service.update(0, 0);
    service.inspect();

    expect(store.selectedAgent()?.id).toBe('a1');
  });
});