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
   * On, and one of the two things Mawy reads that GitHub does not. The syntax
   * is PHP Markdown Extra's and it is the one everybody who writes these uses.
   * Turn it off for a document that has to mean exactly what it would mean
   * there.
   * @default true
   */
  definitionLists?: boolean;
  /**
   * Whether a trailing `{#id}` on a heading is the name that heading is drawn
   * under.
   *
   * On, and the other of the two things Mawy reads that GitHub does not. Turn
   * it off for a document that has to mean exactly what it would mean there,
   * where the braces are characters in the heading.
   * @default true
   */
  headingIds?: boolean;
  /**
   * Whether a run fenced by `---` at the very top of the document is read as
   * the metadata it is, and kept out of what the document says.
   * @default true
   */
  frontmatter?: boolean;
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

    // The rest of the line taken in one piece. Built a character at a time it
    // was a string made and thrown away for every character in the document,
    // which is the cost of parsing rather than the cost of anything read.
    const feed = source.indexOf('\n', at);
    const carriage = source.indexOf('\r', at);
    const end = Math.min(
      feed === -1 ? source.length : feed,
      carriage === -1 ? source.length : carriage
    );

    text += source.slice(at, end);
    out += end - at;
    at = end;

    lines.push({ text, start });

    if (at >= source.length) {
      break;
    }

    const pair = source[at] === '\r' && source[at + 1] === '\n';

    at += pair ? 2 : 1;
    out += 1;

    if (pair) {
      mark();
    }
  }

  // A document that ends in a newline has that many lines and not one more.
  // The loop above runs once past the last character on purpose — a source of
  // nothing at all is still one empty line — and the line it makes there is
  // real only when nothing ended the one before it. Left in, it is a blank
  // line nobody wrote, and the one place that shows is inside a fence the
  // document ended before closing: the code comes out a line taller than it is.
  if (lines.length > 1 && lines[lines.length - 1].text === '') {
    lines.pop();
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
 *
 * This is what a heading is called when it did not say. One that ended in
 * `{#id}` is called that instead, and never comes through here.
 */
export function slugify(text: string): string {
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
        // A heading that wrote its own `{#id}` is called that. It still goes
        // through the counting below: two elements with one `id` is a link
        // that lands on whichever the browser met first, and an author who
        // wrote the same anchor twice has that problem whether the name came
        // out of the words or out of the braces.
        const base = block.id || slugify(text) || 'section';
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
  taken: Map<string, number>,
  /** Every slug given out, so that no two footnotes are given the same one. */
  claimed: Set<string>
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

        footnote.number = into.length + 1;
        // Two labels can slug to the same word, and two elements with the same
        // `id` is a link that lands on whichever the browser met first. The
        // note's own number is what a second one is called after, since that is
        // what the note is called; a document contrived enough to have taken
        // that as well goes on counting until something is free.
        let slug = base;
        let attempt = footnote.number;

        while (claimed.has(slug)) {
          slug = `${base}-${attempt}`;
          attempt += 1;
        }

        footnote.slug = slug;
        claimed.add(slug);
        into.push(footnote);
        // The footnote's own text may point at another one, and that one is
        // numbered here rather than after whatever mentions it further down.
        collectFootnotes(footnote.children as MdNode[], defined, into, taken, claimed);
      }

      continue;
    }

    if (node.type === 'containerDirective') {
      collectFootnotes(node.label as MdNode[], defined, into, taken, claimed);
    }

    if ('children' in node) {
      collectFootnotes(node.children as MdNode[], defined, into, taken, claimed);
    }
  }
}

/** The opening fence, which is the whole of the first line and nothing else. */
const MATTER_OPEN = /^---[ \t]*$/;
/** And the closing one, which YAML writes either way. */
const MATTER_CLOSE = /^(?:---|\.\.\.)[ \t]*$/;

/**
 * The run of metadata at the top of the document, as how many lines it takes
 * and where it was written, or `null` where the document opens with anything
 * else.
 *
 * The fence has to be the first line, and the run has to be closed. `---` on
 * its own at the top of a document is a rule and stays one, and so is a `---`
 * with a heading underlined by another further down — which is the ambiguity
 * this notation has everywhere it is read, and every reader of it answers the
 * same way.
 */
function matterIn(lines: readonly Line[]): { count: number; start: number; end: number } | null {
  if (!lines.length || !MATTER_OPEN.test(lines[0].text)) {
    return null;
  }

  for (let at = 1; at < lines.length; at += 1) {
    if (MATTER_CLOSE.test(lines[at].text)) {
      return { count: at + 1, start: lines[0].start, end: lines[at].start + lines[at].text.length };
    }
  }

  return null;
}

export function parseMarkdown(source: string, options: MarkdownOptions = {}): MdDocument {
  const gfm = options.gfm ?? true;
  const breaks = options.breaks ?? false;
  const definitionLists = options.definitionLists ?? true;
  const headingIds = options.headingIds ?? true;
  const frontmatter = options.frontmatter ?? true;

  const definitions = new Map<string, MdDefinition>();
  const footnotes = new Map<string, MdFootnoteDefinition>();
  const pending: PendingInline[] = [];
  const reading = read(source);

  const matter = frontmatter ? matterIn(reading.lines) : null;
  const children = parseBlocks(matter ? reading.lines.slice(matter.count) : reading.lines, {
    gfm,
    definitionLists,
    headingIds,
    definitions,
    footnotes,
    pending
  });

  const labels = new Set(footnotes.keys());

  for (const { raw, target } of pending) {
    // Pushed one at a time rather than spread. A spread puts every element on
    // the stack as an argument, and a paragraph of a quarter of a megabyte is
    // a hundred and twenty thousand of them — past what an engine will take,
    // and the answer was a thrown `RangeError` rather than a document.
    for (const node of parseInline(raw, { gfm, breaks, definitions, footnotes: labels })) {
      target.push(node);
    }
  }

  const root: MdRoot = { type: 'root', range: { start: 0, end: reading.length }, children };
  const used: MdFootnoteDefinition[] = [];

  collectFootnotes(
    children as MdNode[],
    footnotes,
    used,
    new Map<string, number>(),
    new Set<string>()
  );

  if (reading.breaks.length > 0) {
    relocate(root, reading);

    for (const footnote of used) {
      relocate(footnote as MdNode, reading);
    }
  }

  const outline: MdOutlineEntry[] = [];

  collectOutline(children, new Map(), outline);

  return {
    root,
    outline,
    footnotes: used,
    frontmatter: matter
      ? {
          start: documentOffset(reading, matter.start),
          end: documentOffset(reading, matter.end)
        }
      : null
  };
}
