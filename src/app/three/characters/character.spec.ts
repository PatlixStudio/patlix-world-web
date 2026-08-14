import { TestBed } from '@angular/core/testing';
import { animationForStatus } from './character';
import { CharacterManager } from './character-manager';
import { ProceduralCharacter } from './procedural-character';

describe('character system', () => {
  it('maps agent status to animations', () => {
    expect(animationForStatus('WORKING')).toBe('work');
    expect(animationForStatus('NAVIGATING')).toBe('walk');
    expect(animationForStatus('ASSIGNED')).toBe('walk');
    expect(animationForStatus('BLOCKED')).toBe('blocked');
    expect(animationForStatus('IDLE')).toBe('idle');
    expect(animationForStatus('OFFLINE')).toBe('idle');
  });

  it('procedural character animates limbs without throwing', () => {
    const character = new ProceduralCharacter(0x7fb5ec);
    character.setAnimation('walk');
    character.update(0.016, 1.0);
    character.setAnimation('work');
    character.update(0.016, 1.1);
    character.setAnimation('blocked');
    character.update(0.016, 1.2);
    character.setAnimation('idle');
    character.update(0.016, 1.3);
    expect(character.group.children.length).toBeGreaterThan(3);
    character.dispose();
  });

  it('falls back to procedural character when GLB is missing', async () => {
    TestBed.configureTestingModule({});
    const manager = TestBed.inject(CharacterManager);
    const character = await manager.load('No Such Agent Name', 'WORKING');
    expect(character).toBeInstanceOf(ProceduralCharacter);
    character.setAnimation('work');
    character.update(0.016, 0.5);
    character.dispose();
  });
});