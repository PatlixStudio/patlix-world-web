import { Injectable } from '@angular/core';
import * as THREE from 'three';
import type { ZoneDto } from '@patlixworld/shared';
import { RendererService } from './renderer.service';

/** Deterministic pseudo-noise height field. */
function heightAt(x: number, z: number): number {
  const a =
    Math.sin(x * 0.008) * Math.cos(z * 0.008) * 6 +
    Math.sin(x * 0.02 + 1.3) * Math.cos(z * 0.023) * 3 +
    Math.sin(x * 0.05 + 4.2) * Math.sin(z * 0.045 + 2.1) * 1.2 +
    Math.cos(x * 0.013 + z * 0.017) * 4;
  return a;
}

const ZONE_COLOR: Record<string, number> = {
  beach: 0xd9b36a,
  forest: 0x3e7a3a,
  village: 0x7d9a4f,
  river: 0x5b6a3f,
  mountain: 0x8a8f98,
  hq: 0x6f8f5f,
};

/**
 * Builds the static Patlix World environment: sky + lighting, a rolling
 * terrain height field, water, scattered trees, the Patlix HQ building and
 * zone landmark rings. Pure presentation — the backend stays source of truth.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private readonly groups: { zones: THREE.Group } = {
    zones: new THREE.Group(),
  };
  private readonly treePositions: THREE.Vector3[] = [];

  constructor(private readonly renderer: RendererService) {}

  /** Build the whole static environment into the scene. */
  build(zones: ZoneDto[]): void {
    this.renderer.scene.clear();
    this.renderer.scene.add(this.groups.zones);

    this.buildSky();
    this.buildTerrain();
    this.buildWater();
    this.buildTrees(zones);
    this.buildHq();
    this.buildZoneMarkers(zones);
  }

  /** Ground height at a world position (same height field used for terrain). */
  groundHeight(x: number, z: number): number {
    return heightAt(x, z);
  }

  private buildSky(): void {
    const scene = this.renderer.scene;
    scene.background = new THREE.Color(0x87c4e8);
    scene.fog = new THREE.Fog(0x9fc9e8, 250, 1200);

    scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x8a7a5a, 1.15));

    const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
    sun.position.set(120, 180, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -160;
    sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160;
    sun.shadow.camera.bottom = -160;
    sun.shadow.camera.far = 500;
    scene.add(sun);

    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(14, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false }),
    );
    sunGlow.position.set(300, 420, 260);
    scene.add(sunGlow);
  }

  private buildTerrain(): void {
    const size = 900;
    const segments = 140;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes['position'] as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    const sand = new THREE.Color(0xd9b36a);
    const grass = new THREE.Color(0x5f8f4a);
    const darkGrass = new THREE.Color(0x45703a);
    const rock = new THREE.Color(0x7d8088);
    const snow = new THREE.Color(0xeef2f6);
    const c = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = heightAt(x, z);
      positions.setY(i, h);
      c.copy(grass).lerp(darkGrass, Math.abs(Math.sin(x * 0.02 + z * 0.02)));
      if (h < 0.5) c.lerp(sand, Math.min(1, 0.8 - h));
      if (h > 3) c.lerp(rock, Math.min(1, (h - 3) / 6));
      if (h > 8) c.lerp(snow, Math.min(1, (h - 8) / 4));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    this.renderer.scene.add(terrain);
  }

  private buildWater(): void {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({
        color: 0x2f7fae,
        transparent: true,
        opacity: 0.78,
        roughness: 0.35,
        metalness: 0.1,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.6;
    this.renderer.scene.add(water);
  }

  private buildTrees(zones: ZoneDto[]): void {
    const treeZones = zones.filter((zone) =>
      ['forest', 'village', 'hq', 'river'].includes(zone.kind),
    );
    const rng = mulberry32(1337);
    this.treePositions.length = 0;

    for (const zone of treeZones) {
      const count = zone.kind === 'forest' ? 70 : 26;
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2;
        const radius = Math.sqrt(rng()) * zone.radius;
        const x = zone.center.x + Math.cos(angle) * radius;
        const z = zone.center.z + Math.sin(angle) * radius;
        this.addTree(x, z, 0.8 + rng() * 0.9);
      }
    }
  }

  private addTree(x: number, z: number, scale: number): void {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * scale, 0.4 * scale, 2.2 * scale, 7),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }),
    );
    trunk.position.y = 1.1 * scale;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.5 * scale, 3.4 * scale, 7),
      new THREE.MeshStandardMaterial({
        color: 0x2f6b33,
        roughness: 1,
      }),
    );
    crown.position.y = (2.2 + 1.7) * scale;
    trunk.castShadow = true;
    crown.castShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, heightAt(x, z), z);
    tree.rotation.y = Math.floor(Math.random() * 360);
    this.treePositions.push(tree.position);
    this.renderer.scene.add(tree);
  }

  /** Patlix HQ — a simple office block at the hq zone property position. */
  private buildHq(): void {
    const hq = new THREE.Group();
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(26, 28, 0.8, 32),
      new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.9 }),
    );
    plaza.position.y = 0.4;

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(18, 26, 14),
      new THREE.MeshStandardMaterial({ color: 0x4a6b8a, roughness: 0.6 }),
    );
    tower.position.y = 13;
    tower.castShadow = true;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(19, 1.4, 15),
      new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 }),
    );
    roof.position.y = 26.7;

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.2, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x2f7fd9,
        emissive: 0x2f7fd9,
        emissiveIntensity: 0.6,
      }),
    );
    sign.position.set(0, 20.5, 7.3);

    for (let i = 0; i < 4; i++) {
      const window = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.8),
        new THREE.MeshStandardMaterial({
          color: 0xbfe3ff,
          emissive: 0xbfe3ff,
          emissiveIntensity: 0.35,
        }),
      );
      window.position.set(-7.5 + i * 5, 8 + (i % 2) * 6, 7.01);
      hq.add(window);
      const winB = window.clone();
      winB.position.z = -7.01;
      winB.rotation.y = Math.PI;
      hq.add(winB);
    }

    hq.add(plaza, tower, roof, sign);
    hq.position.set(-40, heightAt(-40, -60), -60);
    this.renderer.scene.add(hq);
  }

  /** Flat landmark ring + altitude pin at each zone center. */
  private buildZoneMarkers(zones: ZoneDto[]): void {
    for (const zone of zones) {
      const color = ZONE_COLOR[zone.kind] ?? 0x5f8f4a;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(zone.radius - 1, zone.radius, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      const y = heightAt(zone.center.x, zone.center.z) + 0.25;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(zone.center.x, y, zone.center.z);

      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 7, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
      pin.position.set(zone.center.x, y + 3.5, zone.center.z);
      pin.castShadow = true;

      const label = this.makeLabel(zone.name, 3);
      label.position.set(zone.center.x, y + 8.5, zone.center.z);

      this.groups.zones.add(ring, pin, label);
    }
  }

  /** Canvas-texture sprite label for names. */
  makeLabel(text: string, scale: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '600 56px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 88, 512, 4);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 12;
      ctx.fillText(text, 256, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale * 2.5, scale * 0.62, 1);
    return sprite;
  }
}

/** Deterministic PRNG so the world looks identical every load. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}