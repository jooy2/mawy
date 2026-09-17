'use client';

/**
 * One piece of code written several ways, drawn as tabs.
 *
 * The same thing in JavaScript, Dart and Python is three code blocks that say
 * one thing, and a page that stacks all three makes a reader scroll past two
 * answers to reach theirs. Every documentation tool has a block for it, under a
 * name of its own: `code-group`, `tabs`, `lang`.
 *
 * Which is why this is a component rather than something the parser knows. The
 * parser reads the shape and stops there — see `MawyDirectives` — so the name
 * is the application's to choose, and this is the drawing to give it:
 *
 * ```tsx
 * <MawyViewer value={document} directives={{ 'code-group': MawyCodeGroup }} />
 * ```
 *
 * ````md
 * ::: code-group
 *
 * ```js
 * sub(10, 1, 5);
 * ```
 *
 * ```dart
 * sub(<int>[10, 1, 5]);
 * ```
 *
 * :::
 * ````
 *
 * A tab per block, named by the language the fence was written with, and
 * `{tabs=a,b}` names them instead where a fence's language is not the word a
 * reader should see — `sh` for a tab that means Terminal.
 *
 * The other shape a document writes is one language per group, which is what
 * `::: lang js` says — and there the group is one answer written out, prose and
 * code together, rather than a block per tab. So a title is what decides: a
 * group that wrote one is one tab called that, holding everything in it, and a
 * group that wrote none is a tab per block.
 */

import * as React from 'react';
import type { MawyDirectiveProps } from '../../types.js';

/** A line that opens or closes a fenced block: its marker, and its language. */
const FENCE = /^[ \t]*(`{3,}|~{3,})[ \t]*([^\s`~]*)/;

/**
 * The language each block of the source opened with, in order.
 *
 * Read by walking rather than by matching every fence, because a closing fence
 * is a fence too: matched all at once, a group of two blocks comes back with
 * four languages and every other one empty. A block closes on the marker it
 * opened with, at least as long and with nothing after it.
 */
function languagesIn(source: string): string[] {
  const out: string[] = [];
  let open: string | null = null;

  for (const line of source.split('\n')) {
    const found = FENCE.exec(line);

    if (!found) {
      continue;
    }

    if (open === null) {
      open = found[1];
      out.push(found[2]);
    } else if (found[1][0] === open[0] && found[1].length >= open.length && !found[2]) {
      open = null;
    }
  }

  return out;
}

/**
 * What each tab is called.
 *
 * `{tabs=…}` first, because a fence says what colours the code rather than what
 * to call it: a block written ```` ```sh ```` is a terminal to a reader and `sh`
 * to a highlighter. Then the fence's own language, and then the block's number,
 * so a group always has as many names as it has blocks.
 */
function namesFor(source: string, attributes: Readonly<Record<string, string>>, count: number) {
  const given = attributes.tabs
    ? attributes.tabs
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    : [];
  const languages = languagesIn(source);

  return Array.from(
    { length: count },
    (unused, index) => given[index] || languages[index] || `${index + 1}`
  );
}

/**
 * The tabs a `MawyDirectives` entry draws. See the file's own comment.
 *
 * A `tablist` with a panel under it, which is the shape the pattern asks for:
 * one tab in the tab order, the arrows to move between them, `Home` and `End`
 * to the ends. Only the chosen block is in the page, so a find on the page
 * finds what a reader can see, and the block's own copy button is the one it
 * has always had.
 */
export function MawyCodeGroup({
  attributes,
  label,
  children,
  source
}: MawyDirectiveProps): React.ReactElement | null {
  const inside = React.Children.toArray(children);
  // A group that named itself is one answer written out — `::: lang js` is the
  // JavaScript of it, prose and code together — so the whole of it is one tab
  // under that name. A group that named nothing is a tab per block, which is
  // what `::: code-group` around three fences means.
  const panels = label ? [inside] : inside.map((block) => [block]);
  const names = label ? [label] : namesFor(source, attributes, inside.length);
  const id = React.useId();
  const [at, setAt] = React.useState(0);
  const tabs = React.useRef<(HTMLButtonElement | null)[]>([]);
  // A group whose blocks changed under a chosen tab keeps a number it no longer
  // has, and a panel nobody can see.
  const chosen = Math.min(at, Math.max(panels.length - 1, 0));

  if (!inside.length) {
    return null;
  }

  const move = (to: number) => {
    const next = (to + panels.length) % panels.length;

    setAt(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step: Record<string, number> = {
      ArrowRight: chosen + 1,
      ArrowLeft: chosen - 1,
      Home: 0,
      End: panels.length - 1
    };

    if (!(event.key in step)) {
      return;
    }

    event.preventDefault();
    move(step[event.key]);
  };

  return (
    <div className="mawy-md-code-group">
      {/* Nothing is named in English where the document named nothing: the
          words would be this library's, and the one place it keeps its own
          words is `MawyStrings`, which a directive a document registered never
          sees. */}
      <div className="mawy-md-code-tabs" role="tablist">
        {names.map((name, index) => (
          <button
            key={index}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            className="mawy-md-code-tab"
            aria-selected={index === chosen}
            aria-controls={`${id}-panel-${index}`}
            // One stop for the whole group, which is what a tab list is: the
            // arrows move inside it and `Tab` leaves it.
            tabIndex={index === chosen ? 0 : -1}
            onClick={() => setAt(index)}
            onKeyDown={onKeyDown}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel-${chosen}`}
        className="mawy-md-code-panel"
        aria-labelledby={`${id}-tab-${chosen}`}
      >
        {panels[chosen]}
      </div>
    </div>
  );
}
