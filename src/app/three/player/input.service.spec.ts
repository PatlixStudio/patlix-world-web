import { TestBed } from '@angular/core/testing';
import { InputService } from './input.service';

describe('InputService', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    input = TestBed.inject(InputService);
    input.attach(document.body);
  });

  afterEach(() => input.ngOnDestroy());

  function key(code: string, type: 'keydown' | 'keyup'): void {
    window.dispatchEvent(new KeyboardEvent(type, { code }));
  }

  it('tracks WASD + shift + space', () => {
    key('KeyW', 'keydown');
    key('ShiftLeft', 'keydown');
    key('Space', 'keydown');
    expect(input.state().forward).toBe(true);
    expect(input.state().run).toBe(true);
    expect(input.state().jump).toBe(true);
    key('KeyW', 'keyup');
    key('ShiftLeft', 'keyup');
    key('Space', 'keyup');
    const state = input.state();
    expect(state.forward).toBe(false);
    expect(state.run).toBe(false);
    expect(state.jump).toBe(false);
  });

  it('maps arrows to movement', () => {
    key('ArrowLeft', 'keydown');
    key('ArrowDown', 'keydown');
    expect(input.state().left).toBe(true);
    expect(input.state().back).toBe(true);
  });

  it('orbits via pointer drag', () => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 50 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 160, clientY: 60 }));
    window.dispatchEvent(new PointerEvent('pointerup'));
    expect(input.orbitYaw).toBeLessThan(0);
    expect(input.orbitPitch).toBeGreaterThan(0.5);
  });
});