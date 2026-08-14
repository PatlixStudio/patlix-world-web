import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
import { EnvironmentService } from './environment.service';
import { RendererService } from './renderer.service';

export interface Waypoint {
  x: number;
  y: number;
  z: number;
  label: string;
}

/**
 * Navigation aid: the active waypoint (set by clicking the minimap), rendered
 * as a flag in the world, plus heading/bearing helpers for the compass.
 */
@Injectable({ providedIn: 'root' })
export class WaypointService {
  readonly waypoint = signal<Waypoint | null>(null);
  private flag: THREE.Group | null = null;

  constructor(
    private readonly renderer: RendererService,
    private readonly environment: EnvironmentService,
  ) {}

  set(x: number, z: number, label: string): void {
    this.clear();
    const y = this.environment.groundHeight(x, z);
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0xff4a4a, emissive: 0xff4a4a, emissiveIntensity: 0.4 }),
    );
    pole.position.y = 1.5;
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.7, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xff4a4a, emissive: 0xff4a4a, emissiveIntensity: 0.3 }),
    );
    cloth.position.set(0.58, 2.6, 0);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.6, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff4a4a,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(pole, cloth, ring);
    group.position.set(x, y, z);
    this.renderer.scene.add(group);
    this.flag = group;
    this.waypoint.set({ x, y, z, label });
  }

  clear(): void {
    if (this.flag) {
      this.renderer.scene.remove(this.flag);
      this.flag = null;
    }
    this.waypoint.set(null);
  }

  /** Distance from a position to the waypoint (or null). */
  distanceTo(x: number, z: number): number | null {
    const wp = this.waypoint();
    if (!wp) return null;
    return Math.hypot(wp.x - x, wp.z - z);
  }

  /** Compass bearing (degrees, 0 = north/+Z) from a position + heading. */
  bearingTo(x: number, z: number, heading: number): number | null {
    const wp = this.waypoint();
    if (!wp) return null;
    const dx = wp.x - x;
    const dz = wp.z - z;
    const world = Math.atan2(dx, dz) * (180 / Math.PI);
    const playerDeg = heading * (180 / Math.PI);
    let rel = world - playerDeg;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    return rel;
  }
}