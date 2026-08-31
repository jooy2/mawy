'use client';

import * as React from 'react';
import type { MawyStrings } from '../../internal/i18n.js';
import { DocumentIcon, UploadIcon } from '../../internal/icons.js';

export interface MawyViewerEmptyProps {
  strings: MawyStrings;
  /** Whether the viewer accepts a dropped file, which changes what it says. */
  droppable: boolean;
  error: string | null;
  onOpenFile: () => void;
}

/**
 * What the viewer is when it has no document.
 *
 * Not an error and not a blank rectangle: with no `value` the viewer is a place
 * to open a file, so the empty state is the control. The same `<input>` the
 * toolbar's Open button uses is behind the button here — one file picker for
 * the component rather than one per affordance.
 */
export function MawyViewerEmpty({
  strings,
  droppable,
  error,
  onOpenFile
}: MawyViewerEmptyProps): React.ReactElement {
  return (
    <div className="mawy-empty" data-mawy-droppable={droppable ? 'true' : undefined}>
      <div className="mawy-empty-mark" aria-hidden="true">
        {droppable ? <UploadIcon /> : <DocumentIcon />}
      </div>
      <h2 className="mawy-empty-title">{strings.emptyTitle}</h2>
      <p className="mawy-empty-hint">{droppable ? strings.emptyHint : strings.emptyAction}</p>
      <button type="button" className="mawy-empty-action" onClick={onOpenFile}>
        {strings.emptyAction}
      </button>
      {error ? (
        <p className="mawy-empty-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
