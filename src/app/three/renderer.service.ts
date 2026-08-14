import { Injectable, type OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Core Three.js renderer for Patlix World. Owns the WebGL renderer, scene,
 * camera and the animation loop; the environment and adapter add objects.
 * Third-person player camera arrives in M7 — until then OrbitControls lets us
 * inspect the world.
 */
@Injectable({ providedIn: 'root' })
export class RendererService implements OnDestroy {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly clock = new THREE.Clock();

  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private container: HTMLElement | null = null;
  private frameId = 0;
  private animationCallbacks: Array<(delta: number, time: number) => void> = [];

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      4000,
    );
  }

  /** Attach to a container element and start rendering. */
  mount(container: HTMLElement): void {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 400;
    this.controls.target.set(0, 0, 0);

    this.camera.position.set(90, 70, 140);
    this.camera.lookAt(0, 0, 0);

    window.addEventListener('resize', this.onResize);
    this.loop();
  }

  /** Register a per-frame callback (drives animations, water, agents...). */
  onFrame(callback: (delta: number, time: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  /** Release a per-frame callback. */
  offFrame(callback: (delta: number, time: number) => void): void {
    const idx = this.animationCallbacks.indexOf(callback);
    if (idx >= 0) this.animationCallbacks.splice(idx, 1);
  }

  private readonly onResize = (): void => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private loop = (): void => {
    this.frameId = requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;
    this.controls?.update();
    for (const callback of this.animationCallbacks) {
      callback(delta, time);
    }
    this.renderer?.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}