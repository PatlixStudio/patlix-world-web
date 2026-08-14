import * as THREE from 'three';

/**
 * Animation states the character system understands. Mapped from agent status
 * by the adapter; concrete rigs translate these to clips/motions.
 */
export type CharacterAnimation = 'idle' | 'walk' | 'work' | 'blocked';

/** Maps an agent status to a character animation. */
export function animationForStatus(status: string): CharacterAnimation {
  switch (status) {
    case 'WORKING':
    case 'WAITING':
    case 'MEETING':
    case 'COMMUNICATING':
      return 'work';
    case 'NAVIGATING':
    case 'ASSIGNED':
      return 'walk';
    case 'BLOCKED':
      return 'blocked';
    default:
      return 'idle';
  }
}

/**
 * A rendered character in the world: a mesh group plus an animation
 * controller. Both procedural and GLB rigs implement this contract so the
 * adapter is rig-agnostic.
 */
export interface Character {
  readonly group: THREE.Group;
  setAnimation(animation: CharacterAnimation): void;
  update(delta: number, time: number): void;
  dispose(): void;
}