import { describe, expect, it } from 'vitest';
import { movePlace } from '../../src/internal/places.js';

/**
 * A place carried through a change. The cases are the ones with a choice in
 * them: something written exactly where a place is, and a change that runs
 * through one.
 */
describe('movePlace', () => {
  const at = (point: number) => ({ start: point, end: point });

  it('leaves a place in front of the change where it is', () => {
    expect(movePlace(at(2), { at: 5, removed: 1, inserted: 'xyz' })).toEqual(at(2));
  });

  it('moves a place behind the change by what the change added', () => {
    expect(movePlace(at(11), { at: 0, removed: 0, inserted: 'ABC ' })).toEqual(at(15));
    expect(movePlace(at(11), { at: 2, removed: 5, inserted: '' })).toEqual(at(6));
  });

  it('keeps its spot when something is written exactly there, unless it is pushed', () => {
    const typed = { at: 4, removed: 0, inserted: 'ab' };

    expect(movePlace(at(4), typed)).toEqual(at(4));
    expect(movePlace(at(4), typed, true)).toEqual(at(6));
  });

  it('lands where a change that ran through it left off', () => {
    expect(movePlace(at(5), { at: 3, removed: 4, inserted: 'xy' })).toEqual(at(5));
    expect(movePlace(at(5), { at: 3, removed: 4, inserted: '' })).toEqual(at(3));
  });

  it('does not take in what is written at either end of a run', () => {
    const run = { start: 4, end: 8 };

    expect(movePlace(run, { at: 4, removed: 0, inserted: 'ab' })).toEqual({ start: 6, end: 10 });
    expect(movePlace(run, { at: 8, removed: 0, inserted: 'ab' })).toEqual(run);
  });

  it('shrinks a run a change cut into, and closes one it removed', () => {
    expect(movePlace({ start: 4, end: 8 }, { at: 6, removed: 4, inserted: '' })).toEqual({
      start: 4,
      end: 6
    });
    expect(movePlace({ start: 4, end: 8 }, { at: 2, removed: 8, inserted: 'new' })).toEqual(at(5));
  });
});
