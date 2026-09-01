/**
 * What the editor counts and shows along its bottom edge.
 *
 * Pure functions of a string and two offsets, in a file of their own rather
 * than inside the component that draws them — which is what lets
 * `scripts/parity.mjs` diff them against `lib/src/editor/status.dart`. A count
 * written twice is a count that reports two different numbers for the same
 * document the first time nobody is comparing them.
 */

/**
 * Han, hiragana and katakana, which are written without spaces between words.
 *
 * Hangul is deliberately not here. Korean *is* spaced, so an eojeol is a word
 * and splitting on whitespace is right; counting each syllable would report a
 * short paragraph as a few hundred words.
 */
const DENSE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

/**
 * A word count that is not simply wrong outside English.
 *
 * Whitespace alone counts a page of Chinese as one word. Counting characters
 * alone counts an English sentence as forty. So the two are added: every dense
 * character is a word, and what is left over is split on spaces.
 */
export function countWords(text: string): number {
  const dense = text.match(DENSE)?.length ?? 0;
  const rest = text.replace(DENSE, ' ').trim();

  return dense + (rest ? rest.split(/\s+/).length : 0);
}

/**
 * Code points rather than UTF-16 units: an emoji is one character to everyone
 * except a `.length`.
 */
export function countCharacters(text: string): number {
  return [...text].length;
}

/** Bytes on disk, which is not the number of characters the moment anything is not ASCII. */
export function countBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** How many lines the document has. */
export function countLines(text: string): number {
  return text.split('\n').length;
}

/** Where the caret is, counting from one, and how much is selected. */
export interface MawyCaretAt {
  line: number;
  column: number;
  /** In code points. */
  selected: number;
}

export function caretAt(value: string, start: number, end: number): MawyCaretAt {
  const before = value.slice(0, start).split('\n');

  return {
    line: before.length,
    column: (before[before.length - 1]?.length ?? 0) + 1,
    selected: countCharacters(value.slice(start, end))
  };
}
