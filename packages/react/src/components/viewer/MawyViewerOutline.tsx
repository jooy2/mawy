'use client';

import * as React from 'react';
import type { MdOutlineEntry } from '../../internal/markdown/ast.js';
import type { MawyStrings } from '../../internal/i18n.js';
import { CloseIcon } from '../../internal/icons.js';
import { IconButton } from '../../internal/controls.js';

export interface MawyViewerOutlineProps {
  entries: readonly MdOutlineEntry[];
  strings: MawyStrings;
  /** The heading the reader is currently at, from the viewer's scroll. */
  active: string | null;
  onSelect: (slug: string) => void;
  onClose: () => void;
}

/**
 * The document's headings, as a place to jump from.
 *
 * The slugs are the ones the renderer put on the headings — not slugs computed
 * a second time here — because an outline whose links are spelled differently
 * from the `id`s they point at is a list where every row does nothing, and
 * nothing about it looks broken.
 *
 * Indentation is by heading depth relative to the shallowest heading in the
 * document, so a file whose headings all start at `##` is not drawn one step in
 * from a margin it never had.
 */
export function MawyViewerOutline({
  entries,
  strings,
  active,
  onSelect,
  onClose
}: MawyViewerOutlineProps): React.ReactElement {
  const top = entries.reduce((least, entry) => Math.min(least, entry.depth), 6);

  return (
    <nav className="mawy-outline" aria-label={strings.outline} lang={strings.lang}>
      <div className="mawy-outline-head">
        <h2 className="mawy-outline-title">{strings.outline}</h2>
        <IconButton
          label={strings.close}
          icon={<CloseIcon className="mawy-icon" aria-hidden="true" />}
          onClick={onClose}
        />
      </div>
      {entries.length ? (
        <ol className="mawy-outline-list">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <button
                type="button"
                className="mawy-outline-link"
                data-mawy-depth={Math.min(entry.depth - top, 3)}
                aria-current={entry.slug === active ? 'location' : undefined}
                onClick={() => onSelect(entry.slug)}
              >
                {entry.text}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mawy-outline-empty">{strings.outlineEmpty}</p>
      )}
    </nav>
  );
}
