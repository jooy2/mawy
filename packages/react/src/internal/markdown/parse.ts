/**
 * Markdown in, document out.
 *
 * Two passes, and the order is the point. Blocks first, because a link written
 * as `[see][ref]` cannot be resolved until the `[ref]:` line at the bottom of
 * the file has been read — so the block pass sets every paragraph's text aside
 * and collects definitions as it goes, and only then is any of that text read
 * as inline content.
 */

import type {
  MdBlock,
  MdDefinition,
  MdDocument,
  MdFootnoteDefinition,
  MdNode,
  MdOutlineEntry,
  MdRoot
} from './ast.js';
import { parseBlocks, type PendingInline } from './block.js';
import { parseInline, toPlainText } from './inline.js';
import type { Line } from './source.js';

export interface MarkdownOptions {
  /**
   * GitHub Flavored Markdown: tables, task lists, `~~strikethrough~~` and bare
   * URLs becoming links.
   * @default true
   */
  gfm?: boolean;
  /**
   * Whether a single newline inside a paragraph is a line break.
   *
   * Off by default, because that is what Markdown says and because a document
   * written elsewhere would reflow differently here. On, it matches the way
   * chat clients and issue trackers behave, which is what a reader who has
   * never written Markdown expects.
   * @default false
   */
  breaks?: boolean;
  /**
   * Whether a line opening with `: ` under a line of text is a definition list.
   *
   * On, and it is the one thing Mawy reads that GitHub does not — the syntax is
   * PHP Markdown Extra's and it is the one everybody who writes these uses.
   * Turn it off for a document that has to mean exactly what it would mean
   * there.
   * @default true
   */
  definitionLists?: boolean;
}

/* -------------------------------------------------------------------------
 * Reading the document into lines
 * ---------------------------------------------------------------------- */

/**
 * The document as the scanner reads it, and the way back to the one that was
 * handed in.
 *
 * Three things are tidied before a rule is applied to a line: a byte order mark
 * is not a character in the document, a `\r\n` is one line ending rather than
 * two characters, and a tab at the front of a line is four columns of
 * indentation to every rule that measures one. Each is far easier to remove
 * once than to allow for in twenty places.
 *
 * All three also move every offset after them, and the offsets are the point of
 * the exercise — so each place the two texts stop lining up is written down,
 * and `documentOffset` reads a position back through them. A file with Unix
 * line endings and no leading tabs has none of them, which is the usual case
 * and costs nothing.
 */
interface Reading {
  lines: Line[];
  /** How long the tidied text is. */
  length: number;
  /** Offsets in the tidied text where it stops lining up, ascending. */
  breaks: number[];
  /** The offset in the original each of those sits at. */
  origins: number[];
}

function read(source: string): Reading {
  const lines: Line[] = [];
  const breaks: number[] = [];
  const origins: number[] = [];
  let at = source.startsWith('\uFEFF') ? 1 : 0;
  let out = 0;

  const mark = () => {
    breaks.push(out);
    origins.push(at);
  };

  if (at > 0) {
    mark();
  }

  while (at <= source.length) {
    const start = out;
    let text = '';

    while (source[at] === '\t') {
      text += '    ';
      at += 1;
      out += 4;
      mark();
    }

    while (at < source.length && source[at] !== '\n' && source[at] !== '\r') {
      text += source[at];
      at += 1;
      out += 1;
    }

    lines.push({ text, start });

    if (at >= source.length) {
      break;
    }

    const carriage = source[at] === '\r' && source[at + 1] === '\n';

    at += carriage ? 2 : 1;
    out += 1;

    if (carriage) {
      mark();
    }
  }

  return { lines, length: out, breaks, origins };
}

/** A position in the tidied text, read back in the document it came from. */
function documentOffset(reading: Reading, offset: number): number {
  const { breaks, origins } = reading;
  let low = 0;
  let high = breaks.length - 1;
  let found = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (breaks[middle] <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const base = found === -1 ? offset : origins[found] + (offset - breaks[found]);
  const next = origins[found + 1];

  // A tab became four characters, so several positions inside it answer to one
  // in the document. Holding them at the next known point keeps the answer
  // inside the tab rather than running past it into the text.
  return next === undefined ? base : Math.min(base, next);
}

/** Every range in the tree, moved back into the document's own offsets. */
function relocate(node: MdNode, reading: Reading): void {
  node.range = {
    start: documentOffset(reading, node.range.start),
    end: documentOffset(reading, node.range.end)
  };

  // A container directive is the one node with two runs of children under it,
  // its `[label]` beside its blocks, and a range that was not moved is a range
  // into a string nobody has any more.
  if (node.type === 'containerDirective') {
    for (const child of node.label) {
      relocate(child, reading);
    }
  }

  if ('children' in node) {
    for (const child of node.children) {
      relocate(child, reading);
    }
  }
}

/* -------------------------------------------------------------------------
 * Headings and the outline
 * ---------------------------------------------------------------------- */

/**
 * A heading's `id`, in the spelling GitHub uses.
 *
 * Matching GitHub matters more than any particular scheme would: the anchors in
 * a README are written by hand against it, so a document that links to
 * `#getting-started` is linking to whatever GitHub would have called that
 * heading. Letters and numbers in any script survive, everything else goes, and
 * spaces become hyphens.
 */
function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      // Each space becomes a hyphen, rather than each *run* of them becoming
      // one. It looks like a bug and it is what GitHub does: `A & B` is `a--b`
      // there, because the ampersand went and the two spaces around it did not.
      .replace(/\s/g, '-')
  );
}

/** Every heading in the tree, given a unique slug and listed for the outline. */
function collectOutline(
  blocks: MdBlock[],
  taken: Map<string, number>,
  into: MdOutlineEntry[]
): void {
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const text = toPlainText(block.children);
        const base = slugify(text) || 'section';
        const seen = taken.get(base) ?? 0;

        taken.set(base, seen + 1);
        block.slug = seen === 0 ? base : `${base}-${seen}`;
        into.push({ depth: block.depth, slug: block.slug, text, range: { ...block.range } });
        break;
      }

      case 'blockquote':
        collectOutline(block.children, taken, into);
        break;

      case 'list':
        for (const item of block.children) {
          collectOutline(item.children, taken, into);
        }

        break;

      // A heading inside a directive is a heading. The package has no idea what
      // the directive means, but the outline is about the document rather than
      // about what draws it.
      case 'containerDirective':
        collectOutline(block.children, taken, into);
        break;

      default:
        break;
    }
  }
}

/**
 * The footnotes something pointed at, in the order they were first pointed at.
 *
 * Reference order rather than the order they were written in, because that is
 * the order they are numbered in and a reader meets `1` before `2`. A footnote
 * nobody referred to is left out entirely, the way a link reference definition
 * nobody used is: it is a note to the author rather than part of what the
 * document says.
 */
function collectFootnotes(
  nodes: MdNode[],
  defined: Map<string, MdFootnoteDefinition>,
  into: MdFootnoteDefinition[],
  /** How many times each label has been met so far. */
  taken: Map<string, number>
): void {
  for (const node of nodes) {
    if (node.type === 'footnoteReference') {
      const footnote = defined.get(node.label);

      if (!footnote) {
        continue;
      }

      const mentions = taken.get(node.label) ?? 0;

      node.index = mentions;
      taken.set(node.label, mentions + 1);

      if (mentions === 0) {
        const base = slugify(node.label) || 'footnote';
        const clash = into.filter((each) => each.slug === base || each.slug.startsWith(`${base}-`));

        footnote.number = into.length + 1;
        // Two labels can slug to the same word, and two elements with the same
        // `id` is a link that lands on whichever the browser met first.
        footnote.slug = clash.length === 0 ? base : `${base}-${footnote.number}`;
        into.push(footnote);
        // The footnote's own text may point at another one, and that one is
        // numbered here rather than after whatever mentions it further down.
        collectFootnotes(footnote.children as MdNode[], defined, into, taken);
      }

      continue;
    }

    if (node.type === 'containerDirective') {
      collectFootnotes(node.label as MdNode[], defined, into, taken);
    }

    if ('children' in node) {
      collectFootnotes(node.children as MdNode[], defined, into, taken);
    }
  }
}

export function parseMarkdown(source: string, options: MarkdownOptions = {}): MdDocument {
  const gfm = options.gfm ?? true;
  const breaks = options.breaks ?? false;
  const definitionLists = options.definitionLists ?? true;

  const definitions = new Map<string, MdDefinition>();
  const footnotes = new Map<string, MdFootnoteDefinition>();
  const pending: PendingInline[] = [];
  const reading = read(source);

  const children = parseBlocks(reading.lines, {
    gfm,
    definitionLists,
    definitions,
    footnotes,
    pending
  });

  const labels = new Set(footnotes.keys());

  for (const { raw, target } of pending) {
    target.push(...parseInline(raw, { gfm, breaks, definitions, footnotes: labels }));
  }

  const root: MdRoot = { type: 'root', range: { start: 0, end: reading.length }, children };
  const used: MdFootnoteDefinition[] = [];

  collectFootnotes(children as MdNode[], footnotes, used, new Map<string, number>());

  if (reading.breaks.length > 0) {
    relocate(root, reading);

    for (const footnote of used) {
      relocate(footnote as MdNode, reading);
    }
  }

  const outline: MdOutlineEntry[] = [];

  collectOutline(children, new Map(), outline);

  return { root, outline, footnotes: used };
}
