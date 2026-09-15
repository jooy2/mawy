/**
 * Finding text on the drawn document, and showing where it was found.
 *
 * The find bar searches the Markdown, which is what a replacement is written
 * into, and the drawn document shows something else: `**bold**` draws `bold`,
 * and a link draws its words and never its address. A match in the characters
 * the page does not draw is a match nobody can see and a count that does not
 * agree with the page, so on this surface a match counts only where every one
 * of its characters is drawn as itself.
 *
 * Marking a match is the other half, and the drawing is React's: an element put
 * around a match would be a node React did not make, in a tree it replaces on
 * the next keystroke. The CSS Custom Highlight API marks ranges without
 * touching the tree, and a browser without it still steps through the matches
 * and selects the one the find bar is on when it closes.
 */

import type { MdNode } from './markdown/ast.js';
import { parseMarkdown, type MarkdownOptions } from './markdown/parse.js';
import { domAt } from './position.js';
import type { MawyMatch } from './search.js';

/**
 * The runs of the document drawn as the characters they are written with, in
 * order: words, the inside of a code span, and each line of a code block.
 */
function drawnRuns(value: string, options: MarkdownOptions): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  const document = parseMarkdown(value, options);

  const walk = (nodes: readonly MdNode[]) => {
    for (const node of nodes) {
      if (node.type === 'text') {
        // A run with a reference or an escape decoded in it is not its own
        // characters, and nothing here can say where in it a match would be.
        if (value.slice(node.range.start, node.range.end) === node.value) {
          runs.push({ start: node.range.start, end: node.range.end });
        }
      } else if (node.type === 'inlineCode') {
        const at = value.indexOf(node.value, node.range.start);

        if (at !== -1 && at + node.value.length <= node.range.end) {
          runs.push({ start: at, end: at + node.value.length });
        }
      } else if (node.type === 'code') {
        node.value.split('\n').forEach((line, index) => {
          const start = node.lines[index];

          if (start !== undefined && value.slice(start, start + line.length) === line) {
            runs.push({ start, end: start + line.length });
          }
        });
      }

      if ('children' in node) {
        walk(node.children as MdNode[]);
      }
    }
  };

  walk([...document.root.children, ...document.footnotes]);

  return runs.sort((one, other) => one.start - other.start);
}

/** The matches every character of which the drawn document draws as itself. */
export function drawnMatches(
  value: string,
  matches: readonly MawyMatch[],
  options: MarkdownOptions
): MawyMatch[] {
  if (!matches.length) {
    return [];
  }

  const runs = drawnRuns(value, options);
  const out: MawyMatch[] = [];
  let run = 0;

  for (const match of matches) {
    while (run < runs.length && runs[run].end < match.end) {
      run += 1;
    }

    if (run < runs.length && runs[run].start <= match.start && match.end <= runs[run].end) {
      out.push(match);
    }
  }

  return out;
}

/** Every editor's marks, so that two editors finding at once both keep theirs. */
const painted = new Map<object, { all: Range[]; current: Range[] }>();

/** The registry, where the browser has one. */
function registry(): HighlightRegistry | null {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'
    ? CSS.highlights
    : null;
}

function repaint(): void {
  const highlights = registry();

  if (!highlights) {
    return;
  }

  const all = [...painted.values()].flatMap((each) => each.all);
  const current = [...painted.values()].flatMap((each) => each.current);

  if (all.length) {
    highlights.set('mawy-find', new Highlight(...all));
  } else {
    highlights.delete('mawy-find');
  }

  if (current.length) {
    highlights.set('mawy-find-current', new Highlight(...current));
  } else {
    highlights.delete('mawy-find-current');
  }
}

/** A place in the document as a range on the page, or `null` where it is not drawn. */
export function rangeFor(root: HTMLElement, value: string, match: MawyMatch): Range | null {
  const head = domAt(root, match.start, value);
  const tail = domAt(root, match.end, value);

  if (!head || !tail) {
    return null;
  }

  const range = root.ownerDocument.createRange();

  range.setStart(head.node, head.offset);
  range.setEnd(tail.node, tail.offset);

  return range;
}

/** How many matches either side of the current one are marked at most. */
const MARKED_AROUND = 400;

/**
 * The matches marked on the drawn document, for one editor.
 *
 * At most a few hundred either side of the one being stepped through: finding
 * `a` in a long document is thousands of matches, and a range for each is a
 * walk of the page for each, on every keystroke in the find box. The ones
 * further off are marked when stepping reaches them.
 */
export function paintMatches(
  owner: object,
  root: HTMLElement,
  value: string,
  matches: readonly MawyMatch[],
  current: number
): void {
  if (!registry()) {
    return;
  }

  const from = Math.max(0, Math.max(current, 0) - MARKED_AROUND);
  const to = Math.min(matches.length, Math.max(current, 0) + MARKED_AROUND);
  const all: Range[] = [];
  let now: Range[] = [];

  for (let index = from; index < to; index += 1) {
    const range = rangeFor(root, value, matches[index]);

    if (range) {
      all.push(range);

      if (index === current) {
        now = [range];
      }
    }
  }

  painted.set(owner, { all, current: now });
  repaint();
}

/** One editor's marks, taken away. */
export function unpaintMatches(owner: object): void {
  if (painted.delete(owner)) {
    repaint();
  }
}
