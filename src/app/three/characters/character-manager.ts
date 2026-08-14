import { Injectable } from '@angular/core';
import type { Character, CharacterAnimation } from './character';
import { animationForStatus } from './character';
import { GlbCharacter } from './glb-character';
import { ProceduralCharacter } from './procedural-character';

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

/** Character asset location under the web app's public/ dir. */
export const CHARACTER_ASSETS_DIR = 'assets/characters';

/**
 * Character factory: loads a Mixamo-style GLB character for an agent when the
 * asset exists (`public/assets/characters/<name>.glb`), otherwise falls back
 * to the built-in procedural rig. Status colors + animation mapping are shared.
 */
@Injectable({ providedIn: 'root' })
export class CharacterManager {
  async load(
    name: string,
    status: string,
  ): Promise<Character> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const url = `${CHARACTER_ASSETS_DIR}/${slug}.glb`;
    try {
      const glb = await GlbCharacter.load(url);
      glb.setAnimation(animationForStatus(status));
      return glb;
    } catch {
      const procedural = new ProceduralCharacter(
        STATUS_COLOR[status] ?? 0x7fb5ec,
      );
      procedural.setAnimation(animationForStatus(status));
      return procedural;
    }
  }

  colorFor(status: string): number {
    return STATUS_COLOR[status] ?? 0x7fb5ec;
  }

  animateFor(status: string): CharacterAnimation {
    return animationForStatus(status);
  }
}