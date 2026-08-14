import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import type { AgentDto, ZoneDto } from '@patlixworld/shared';
import { AgentStatus } from '@patlixworld/shared';
import { EnvironmentService } from '../three/environment.service';
import { RendererService } from '../three/renderer.service';
import { ThreeWorldAdapter } from '../three/three-world-adapter';

describe('ThreeWorldAdapter', () => {
  let renderer: RendererService;
  let environment: EnvironmentService;
  let adapter: ThreeWorldAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    renderer = TestBed.inject(RendererService);
    environment = TestBed.inject(EnvironmentService);
    adapter = TestBed.inject(ThreeWorldAdapter);
  });

  afterEach(() => adapter.ngOnDestroy());

  const zone = (id: string, kind: string, x: number, z: number): ZoneDto => ({
    id,
    name: id.toUpperCase(),
    kind,
    center: { x, y: 0, z },
    radius: 80,
  });

  it('groundHeight is deterministic', () => {
    expect(environment.groundHeight(10, 20)).toBe(
      environment.groundHeight(10, 20),
    );
    expect(typeof environment.groundHeight(10, 20)).toBe('number');
  });

  it('setZones builds environment objects into the scene', () => {
    const before = renderer.scene.children.length;
    adapter.setZones([
      zone('beach', 'beach', 0, 0),
      zone('forest', 'forest', 100, -80),
      zone('hq', 'hq', -40, -60),
    ]);
    const after = renderer.scene.children.length;
    expect(after).toBeGreaterThan(before);
  });

  it('setAgents creates, updates and removes agent meshes', () => {
    const agent = (id: string, status: AgentStatus): AgentDto => ({
      id,
      name: `Agent-${id}`,
      role: 'Role',
      persona: '',
      status,
      model: { provider: 'openrouter', model: 'x' },
      location: { zoneId: 'hq', x: -40, y: 0, z: -60, heading: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    adapter.setAgents([agent('a1', AgentStatus.IDLE)]);
    const group1 = renderer.scene.getObjectByName('Agent-a1');
    expect(group1).toBeTruthy();

adapter.setAgents([agent('a1', AgentStatus.WORKING), agent('a2', AgentStatus.BLOCKED)]);
    expect(renderer.scene.getObjectByName('Agent-a1')).toBeTruthy();
    expect(renderer.scene.getObjectByName('Agent-a2')).toBeTruthy();

    adapter.setAgents([]);
    expect(renderer.scene.getObjectByName('Agent-a1')).toBeFalsy();
    expect(renderer.scene.getObjectByName('Agent-a2')).toBeFalsy();
  });

  it('positions agents at backend location above ground', () => {
    const agent = (id: string): AgentDto => ({
      id,
      name: 'Agent-pos',
      role: 'Role',
      persona: '',
      status: AgentStatus.IDLE,
      model: { provider: 'openrouter', model: 'x' },
      location: { zoneId: 'beach', x: 5, y: 0, z: 7, heading: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    adapter.setAgents([agent('pos')]);
    const mesh = renderer.scene.getObjectByName('Agent-pos') as THREE.Group;
    expect(mesh.position.x).toBe(5);
    expect(mesh.position.z).toBe(7);
    expect(mesh.position.y).toBeGreaterThan(
      environment.groundHeight(5, 7),
    );
  });
});