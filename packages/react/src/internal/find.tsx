'use client';

import * as React from 'react';
import type { MawyStrings } from './i18n.js';
import { IconButton } from './controls.js';
import {
  CaseSensitiveIcon,
  CloseIcon,
  NextMatchIcon,
  PreviousMatchIcon,
  ReplaceAllIcon,
  ReplaceIcon
} from './icons.js';

export interface FindBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  matchCase: boolean;
  onMatchCaseChange: (matchCase: boolean) => void;
  /** How many matches there are, and which one is being stepped through. */
  total: number;
  current: number;
  onStep: (forwards: boolean) => void;
  onClose: () => void;
  strings: MawyStrings;
  /**
   * The second row, which is the whole of what makes this a *replace* bar.
   *
   * Absent in the viewer, where there is nothing to put anything in place of.
   * A row of two buttons that can never be pressed is not a smaller version of
   * a feature; it is a promise the surface cannot keep.
   */
  replacement?: string;
  onReplacementChange?: (replacement: string) => void;
  onReplace?: () => void;
  onReplaceAll?: () => void;
  /** Off while the document cannot be written to. */
  editable?: boolean;
}

/**
 * The find bar, over whichever surface asked for one.
 *
 * It exists because the browser's own find cannot reach the editor's source:
 * that surface is a `<textarea>`, and no browser searches the text inside one.
 * The viewer is a page of ordinary elements and `Ctrl`+`F` does reach it — but
 * a viewer inside a scrolling pane of somebody else's application is a window
 * the browser's find scrolls past rather than into, and a reader who has just
 * been given a find button on the editor looks for the same button here.
 *
 * A `search` landmark rather than a `<form>`: there is nothing to submit, and
 * `Enter` in either field is the next match rather than a page reload avoided
 * by `preventDefault`.
 */
export function FindBar({
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
}: FindBarProps): React.ReactElement {
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

      {onReplace && onReplaceAll && onReplacementChange ? (
        <div className="mawy-find-row">
          <input
            type="text"
            className="mawy-find-input"
            value={replacement ?? ''}
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
      ) : null}
    </div>
  );
}
