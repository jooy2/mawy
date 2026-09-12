/**
 * A place in the document, carried through the changes made to it.
 *
 * An image is decided on in one moment and written in another: the file is
 * pasted where the caret is, and the URL to write comes back from the
 * application a second or ten later. The document the answer arrives in is not
 * the one the file left — somebody went on typing — so an offset read at the
 * paste and trusted at the answer points at wherever the characters in front of
 * it have pushed it to, which is the middle of a word as often as not.
 *
 * So the place is moved with every change instead, by the same arithmetic that
 * moves a caret. The change is the smallest run that differs between the two
 * documents — `difference` in `history.ts` — which is exact for what this editor
 * writes itself and a close guess for what a textarea did, since a run of the
 * same character repeated can be said to have grown at either end.
 */

import type { MawyStep } from './history.js';

/** A run of the document, which a caret is when both ends are the same. */
export type MawyPlace = Pick<MawyStep, 'start' | 'end'>;

/** One change to a document: `removed` characters at `at`, and `inserted` there instead. */
export interface MawyChange {
  at: number;
  removed: number;
  inserted: string;
}

/**
 * Where a place is once a change has been made in front of it, through it, or
 * behind it.
 *
 * The question with an answer that is a choice is what happens to a caret when
 * something is written exactly where it is. `pushed` says the writing goes in
 * front of it, which is what a caret does when somebody types: the caret ends
 * up after what was typed. Left off, the place keeps its spot and what was
 * written ends up after it — which is right for an image still uploading at the
 * spot where somebody carried on typing, since the image was put there first.
 *
 * A run is never pushed open: something written at its start goes in front of
 * it and something written at its end goes after it, because neither is part
 * of what was selected. A run the change removed collapses to where the change
 * left off.
 */
export function movePlace(place: MawyPlace, change: MawyChange, pushed = false): MawyPlace {
  const { at, removed, inserted } = change;
  const through = at + removed;
  const shift = inserted.length - removed;

  if (place.start === place.end) {
    const point = place.start;
    const kept = point < at || (point === at && !pushed);
    const moved = kept ? point : point >= through ? point + shift : at + inserted.length;

    return { start: moved, end: moved };
  }

  const start =
    place.start < at
      ? place.start
      : place.start >= through
        ? place.start + shift
        : at + inserted.length;
  const end = place.end <= at ? place.end : place.end >= through ? place.end + shift : at;

  return start > end ? { start, end: start } : { start, end };
}
