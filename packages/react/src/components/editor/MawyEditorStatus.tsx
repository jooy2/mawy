'use client';

import * as React from 'react';
import type { MawyEditorStatusItem, MawyLocale } from '../../types.js';
import type { MawyStrings } from '../../internal/i18n.js';
import {
  caretAt,
  countBytes,
  countCharacters,
  countLines,
  countWords
} from '../../internal/status.js';

/** A byte count, as a size somebody reads rather than as a number. */
function formatBytes(bytes: number, format: Intl.NumberFormat): string {
  if (bytes < 1024) {
    return `${format.format(bytes)} B`;
  }

  const kilobytes = bytes / 1024;

  return kilobytes < 1024
    ? `${format.format(Math.round(kilobytes * 10) / 10)} KB`
    : `${format.format(Math.round((kilobytes / 1024) * 100) / 100)} MB`;
}

export interface MawyEditorStatusProps {
  value: string;
  selection: { start: number; end: number };
  items: readonly MawyEditorStatusItem[];
  strings: MawyStrings;
  locale: MawyLocale;
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
      lines: countLines(value),
      words: countWords(value),
      characters: countCharacters(value),
      bytes: countBytes(value)
    }),
    [value]
  );

  const at = React.useMemo(
    () => caretAt(value, selection.start, selection.end),
    [value, selection.start, selection.end]
  );

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
    <p className="mawy-status" lang={strings.lang}>
      {/* A word rather than an `aria-label`, which is what this used to have:
          an `aria-label` on a paragraph names something that has no name to
          give, and most screen readers read the text and drop the label. The
          Flutter package says the same word the same way round, before the
          counts. */}
      <span className="mawy-visually-hidden">{strings.status}</span>
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
