import { Injectable, type OnDestroy } from '@angular/core';

export interface PlayerInputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
}

/**
 * Keyboard + pointer input for the player. WASD/arrows to move, Shift to run,
 * Space to jump; mouse drag orbits the camera, wheel zooms.
 */
@Injectable({ providedIn: 'root' })
export class InputService implements OnDestroy {
  readonly keys = new Set<string>();
  orbitYaw = 0;
  orbitPitch = 0.5;
  orbitDistance = 12;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private listeners: Array<[EventTarget, string, (e: Event) => void]> = [];

  attach(target: EventTarget): void {
    const onKeyDown = (e: Event): void => {
      const ke = e as KeyboardEvent;
      this.keys.add(ke.code);
    };
    const onKeyUp = (e: Event): void => {
      const ke = e as KeyboardEvent;
      this.keys.delete(ke.code);
    };
    const onPointerDown = (e: Event): void => {
      this.dragging = true;
      const pe = e as PointerEvent;
      this.lastX = pe.clientX;
      this.lastY = pe.clientY;
    };
    const onPointerMove = (e: Event): void => {
      if (!this.dragging) return;
      const pe = e as PointerEvent;
      const dx = pe.clientX - this.lastX;
      const dy = pe.clientY - this.lastY;
      this.lastX = pe.clientX;
      this.lastY = pe.clientY;
      this.orbitYaw -= dx * 0.005;
      this.orbitPitch = Math.min(1.35, Math.max(0.1, this.orbitPitch + dy * 0.005));
    };
    const onPointerUp = (): void => {
      this.dragging = false;
    };
    const onWheel = (e: Event): void => {
      const we = e as WheelEvent;
      this.orbitDistance = Math.min(30, Math.max(4, this.orbitDistance + we.deltaY * 0.01));
    };

    this.listeners.push(
      [window, 'keydown', onKeyDown],
      [window, 'keyup', onKeyUp],
      [target, 'pointerdown', onPointerDown],
      [window, 'pointermove', onPointerMove],
      [window, 'pointerup', onPointerUp],
      [target, 'wheel', onWheel],
    );
    for (const [el, name, fn] of this.listeners) {
      el.addEventListener(name, fn);
    }
  }

  /** Snapshot of movement intent for the current frame. */
  state(): PlayerInputState {
    const k = this.keys;
    return {
      forward: k.has('KeyW') || k.has('ArrowUp'),
      back: k.has('KeyS') || k.has('ArrowDown'),
      left: k.has('KeyA') || k.has('ArrowLeft'),
      right: k.has('KeyD') || k.has('ArrowRight'),
      run: k.has('ShiftLeft') || k.has('ShiftRight'),
      jump: k.has('Space'),
    };
  }

  ngOnDestroy(): void {
    for (const [el, name, fn] of this.listeners) {
      el.removeEventListener(name, fn);
    }
    this.listeners = [];
  }
}