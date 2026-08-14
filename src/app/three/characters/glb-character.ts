import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Character, CharacterAnimation } from './character';

/** Mixamo-style clip name synonyms per animation state. */
const CLIP_ALIASES: Record<CharacterAnimation, string[]> = {
  idle: ['idle', 'Idle', 'standing', 'Standing'],
  walk: ['walk', 'Walk', 'Walking', 'run', 'Run'],
  work: ['work', 'Work', 'Typing', 'typing', 'Writing', 'writing', 'Talking', 'talking'],
  blocked: ['stumble', 'Stumble', 'sitting', 'Sitting', 'Sad', 'sad'],
};

/**
 * Rigged character loaded from a Mixamo-style GLB. Plays animation clips via a
 * THREE.AnimationMixer; states are mapped to clips by name synonym, falling
 * back to the first clip when no match exists.
 */
export class GlbCharacter implements Character {
  readonly group = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly clips = new Map<CharacterAnimation, THREE.AnimationClip>();
  private active: THREE.AnimationAction | null = null;

  private constructor(model: THREE.Group, clips: THREE.AnimationClip[]) {
    this.group.add(model);
    this.mixer = new THREE.AnimationMixer(model);

    for (const state of Object.keys(CLIP_ALIASES) as CharacterAnimation[]) {
      const names = CLIP_ALIASES[state];
      const clip =
        clips.find((c) => names.some((n) => c.name.toLowerCase().includes(n.toLowerCase()))) ??
        (state === 'idle' ? clips[0] : undefined);
      if (clip) this.clips.set(state, clip);
    }
  }

  static load(url: string): Promise<GlbCharacter> {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        url,
        (gltf) => {
          const model = gltf.scene;
          const clips = gltf.animations ?? [];
          // Normalize so the model stands at world origin facing +Z.
          model.position.y = 0;
          model.rotation.y = 0;
          resolve(new GlbCharacter(model, clips));
        },
        undefined,
        reject,
      );
    });
  }

  setAnimation(animation: CharacterAnimation): void {
    const clip = this.clips.get(animation) ?? this.clips.get('idle');
    if (!clip) return;
    if (this.active?.getClip() === clip) return;
    this.active?.fadeOut(0.15);
    this.active = this.mixer.clipAction(clip);
    this.active.reset().fadeIn(0.15).play();
  }

  update(delta: number): void {
    this.mixer.update(delta);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((m) => m.dispose());
      }
    });
  }
}