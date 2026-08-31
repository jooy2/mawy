'use client';

import * as React from 'react';
import type { MawyEditorStatusItem, MawyLocale } from '../../types.js';
import type { MawyStrings } from '../../internal/i18n.js';

export interface MawyEditorStatusProps {
  value: string;
  selection: { start: number; end: number };
  items: readonly MawyEditorStatusItem[];
  strings: MawyStrings;
  locale: MawyLocale;
}

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
function countWords(text: string): number {
  const dense = text.match(DENSE)?.length ?? 0;
  const rest = text.replace(DENSE, ' ').trim();

  return dense + (rest ? rest.split(/\s+/).length : 0);
}

/** Bytes on disk, which is not the number of characters the moment anything is not ASCII. */
function countBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function formatBytes(bytes: number, format: Intl.NumberFormat): string {
  if (bytes < 1024) {
    return `${format.format(bytes)} B`;
  }

  const kilobytes = bytes / 1024;

  return kilobytes < 1024
    ? `${format.format(Math.round(kilobytes * 10) / 10)} KB`
    : `${format.format(Math.round((kilobytes / 1024) * 100) / 100)} MB`;
}

/**
 * The line the editor draws along its bottom edge.
 *
 * Everything on it is derived from the document and the selection, so it is
 * recomputed on a keystroke — which is why the two expensive counts sit behind
 * their own memo and the cheap ones do not bother.
 */
export function MawyEditorStatus({
  value,
  selection,
  items,
  strings,
  locale
}: MawyEditorStatusProps): React.ReactElement {
  const format = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const counts = React.useMemo(
    () => ({
      lines: value.split('\n').length,
      words: countWords(value),
      // Code points rather than UTF-16 units: an emoji is one character to
      // everyone except a `.length`.
      characters: [...value].length,
      bytes: countBytes(value)
    }),
    [value]
  );

  const at = React.useMemo(() => {
    const before = value.slice(0, selection.start);
    const line = before.split('\n');

    return {
      line: line.length,
      column: (line[line.length - 1]?.length ?? 0) + 1,
      selected: [...value.slice(selection.start, selection.end)].length
    };
  }, [value, selection.start, selection.end]);

  const cells: React.ReactNode[] = [];

  for (const item of items) {
    switch (item) {
      case 'position':
        cells.push(
          strings.statusPosition
            .replace('%L', format.format(at.line))
            .replace('%C', format.format(at.column))
        );
        break;
      case 'selection':
        if (at.selected > 0) {
          cells.push(strings.statusSelected.replace('%N', format.format(at.selected)));
        }

        break;
      case 'lines':
        cells.push(`${format.format(counts.lines)} ${strings.statusLines}`);
        break;
      case 'words':
        cells.push(`${format.format(counts.words)} ${strings.statusWords}`);
        break;
      case 'characters':
        cells.push(`${format.format(counts.characters)} ${strings.statusCharacters}`);
        break;
      case 'size':
        cells.push(formatBytes(counts.bytes, format));
        break;
      default:
        break;
    }
  }

  return (
    <p className="mawy-status" aria-label={strings.status}>
      {cells.map((cell, index) => (
        <span key={index} className="mawy-status-cell">
          {cell}
        </span>
      ))}
    </p>
  );
}

/** Everything, in the order it is drawn when `status` is just `true`. */
export const DEFAULT_STATUS: readonly MawyEditorStatusItem[] = [
  'position',
  'selection',
  'lines',
  'words',
  'characters',
  'size'
];
