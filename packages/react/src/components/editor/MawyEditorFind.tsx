'use client';

import * as React from 'react';
import type { MawyStrings } from '../../internal/i18n.js';
import { IconButton } from '../../internal/controls.js';
import {
  CaseSensitiveIcon,
  CloseIcon,
  NextMatchIcon,
  PreviousMatchIcon,
  ReplaceAllIcon,
  ReplaceIcon
} from '../../internal/icons.js';

export interface MawyEditorFindProps {
  query: string;
  onQueryChange: (query: string) => void;
  replacement: string;
  onReplacementChange: (replacement: string) => void;
  matchCase: boolean;
  onMatchCaseChange: (matchCase: boolean) => void;
  /** How many matches there are, and which one the caret is on. `-1` for none. */
  total: number;
  current: number;
  onStep: (forwards: boolean) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
  /** Off while the document cannot be written to. */
  editable: boolean;
  strings: MawyStrings;
}

/**
 * The find bar, over the source.
 *
 * It exists because the browser's own find cannot reach here: the source
 * surface is a `<textarea>`, and no browser searches the text inside one. That
 * is the whole justification — everywhere else in this library a thing the
 * platform already does is left to the platform.
 *
 * A `search` landmark rather than a `<form>`: there is nothing to submit, and
 * `Enter` in either field is the next match rather than a page reload avoided
 * by `preventDefault`.
 */
export function MawyEditorFind({
  query,
  onQueryChange,
  replacement,
  onReplacementChange,
  matchCase,
  onMatchCaseChange,
  total,
  current,
  onStep,
  onReplace,
  onReplaceAll,
  onClose,
  editable,
  strings
}: MawyEditorFindProps): React.ReactElement {
  const field = React.useRef<HTMLInputElement>(null);

  // The bar is opened to be typed in, so it takes the focus when it appears —
  // and `Escape` gives it back to the surface, which is the other half of that
  // and lives in the editor, where the surface is.
  React.useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  const count = query
    ? total === 0
      ? strings.findNoMatches
      : strings.findMatches.replace('%N', String(current + 1)).replace('%T', String(total))
    : '';

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onStep(!event.shiftKey);

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="mawy-find" role="search" aria-label={strings.find} onKeyDown={onKeyDown}>
      <div className="mawy-find-row">
        <input
          ref={field}
          type="text"
          className="mawy-find-input"
          value={query}
          aria-label={strings.find}
          placeholder={strings.find}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
        {/* Said rather than only shown: a count nobody reads out is a count the
            person who most needs it does not have. */}
        <span className="mawy-find-count" role="status">
          {count}
        </span>
        <IconButton
          label={strings.findMatchCase}
          icon={<CaseSensitiveIcon className="mawy-icon" aria-hidden="true" />}
          pressed={matchCase}
          aria-pressed={matchCase}
          onClick={() => onMatchCaseChange(!matchCase)}
        />
        <IconButton
          label={strings.findPrevious}
          icon={<PreviousMatchIcon className="mawy-icon" aria-hidden="true" />}
          disabled={total === 0}
          onClick={() => onStep(false)}
        />
        <IconButton
          label={strings.findNext}
          icon={<NextMatchIcon className="mawy-icon" aria-hidden="true" />}
          disabled={total === 0}
          onClick={() => onStep(true)}
        />
        <IconButton
          label={strings.findClose}
          icon={<CloseIcon className="mawy-icon" aria-hidden="true" />}
          onClick={onClose}
        />
      </div>

      <div className="mawy-find-row">
        <input
          type="text"
          className="mawy-find-input"
          value={replacement}
          aria-label={strings.replace}
          placeholder={strings.replace}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onChange={(event) => onReplacementChange(event.currentTarget.value)}
        />
        <IconButton
          label={strings.replaceOne}
          icon={<ReplaceIcon className="mawy-icon" aria-hidden="true" />}
          disabled={!editable || total === 0}
          onClick={onReplace}
        />
        <IconButton
          label={strings.replaceAll}
          icon={<ReplaceAllIcon className="mawy-icon" aria-hidden="true" />}
          disabled={!editable || total === 0}
          onClick={onReplaceAll}
        />
      </div>
    </div>
  );
}
