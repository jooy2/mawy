/**
 * Markdown in, document out.
 *
 * Two passes, and the order is the point. Blocks first, because a link written
 * as `[see][ref]` cannot be resolved until the `[ref]:` line at the bottom of
 * the file has been read — so the block pass sets every paragraph's text aside
 * and collects definitions as it goes, and only then is any of that text read
 * as inline content.
 */

import type { MdBlock, MdDefinition, MdDocument, MdOutlineEntry, MdRoot } from './ast.js';
import { parseBlocks, type PendingInline } from './block.js';
import { parseInline, toPlainText } from './inline.js';

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
}

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
        into.push({ depth: block.depth, slug: block.slug, text });
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

      default:
        break;
    }
  }
}

export function parseMarkdown(source: string, options: MarkdownOptions = {}): MdDocument {
  const gfm = options.gfm ?? true;
  const breaks = options.breaks ?? false;

  const definitions = new Map<string, MdDefinition>();
  const pending: PendingInline[] = [];

  // A byte order mark is not a character in the document, and a tab at the
  // front of a line is four columns of indentation to every rule that measures
  // one. Both are easier to remove once than to allow for everywhere.
  const lines = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\t+/, (tabs) => '    '.repeat(tabs.length)));

  const children = parseBlocks(lines, { gfm, definitions, pending });

  for (const { raw, target } of pending) {
    target.children = parseInline(raw, { gfm, breaks, definitions });
  }

  const root: MdRoot = { type: 'root', children };
  const outline: MdOutlineEntry[] = [];

  collectOutline(children, new Map(), outline);

  return { root, outline };
}
