import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { WaypointService } from './waypoint.service';
import { RendererService } from './renderer.service';
import { EnvironmentService } from './environment.service';

describe('WaypointService', () => {
  let service: WaypointService;
  let scene: THREE.Scene;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WaypointService,
        {
          provide: RendererService,
          useValue: { scene: new THREE.Scene() },
        },
        {
          provide: EnvironmentService,
          useValue: { groundHeight: () => 0 },
        },
      ],
    });
    service = TestBed.inject(WaypointService);
    scene = TestBed.inject(RendererService).scene;
  });

  it('sets a flag mesh and waypoint state', () => {
    service.set(10, 20, 'Target');
    expect(service.waypoint()).toEqual({ x: 10, y: 0, z: 20, label: 'Target' });
    expect(scene.children.length).toBe(1);
  });

  it('clears the flag and waypoint', () => {
    service.set(10, 20, 'Target');
    service.clear();
    expect(service.waypoint()).toBeNull();
    expect(scene.children.length).toBe(0);
  });

  it('reports distance and bearing to the waypoint', () => {
    service.set(10, 20, 'Target');
    expect(service.distanceTo(10, 20)).toBe(0);
    expect(service.distanceTo(10, 25)).toBe(5);
    expect(service.bearingTo(0, 0, 0)).toBeCloseTo(
      Math.atan2(10, 20) * (180 / Math.PI),
    );
    expect(service.distanceTo(0, 0)).toBeCloseTo(Math.hypot(10, 20));
  });
});