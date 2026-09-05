/**
 * Finding a run of text in a *drawn* document, as opposed to in its source.
 *
 * The editor's find bar searches the Markdown, because the Markdown is what is
 * on the screen there. A viewer's cannot: `**bold**` draws four characters and
 * six were written, and a reader looking for `bold` is looking for what they
 * can see. So what is searched here is the text the document draws — the
 * characters inside every run of prose and every code span — and the markup
 * that decided how they are drawn is not part of it.
 *
 * The answer is keyed by the node that draws each run rather than by a position
 * in the whole document, which is what keeps the renderer honest: it looks up
 * the node it is about to draw and marks what it is told, and there is no
 * second traversal that has to agree with the first about where anything is.
 *
 * One consequence, and it is the same one the browser's own find has in
 * reverse: a match cannot straddle two runs. `he` and `llo` in `he**llo**` are
 * two runs, and `hello` is not found across them. Splitting a phrase across a
 * bold is rare enough, and a search that quietly reported a match it could not
 * point at would be worse than one that says there is none.
 *
 * `lib/src/markdown/find.dart` is this file in Dart, and `scripts/parity.mjs`
 * diffs the two over every document in the corpus. Which nodes draw prose a
 * reader can search is the whole of this file, and two traversals that disagree
 * about it report different numbers of matches for the same page — which is the
 * one part of a find bar a reader can check.
 */

import type { MdBlock, MdInline } from './ast.js';
import { findMatches, type MawyMatch } from '../search.js';

/** A match, and which number it is in the document. */
export interface MawyDocumentMatch extends MawyMatch {
  /** Counting from zero, in reading order. */
  index: number;
}

/** What a query found, ready for the renderer to draw. */
export interface MawyFound {
  /** How many there are, all told. */
  total: number;
  /** Which of them are in the run a given node draws. */
  at: Map<MdInline, MawyDocumentMatch[]>;
}

/** Nothing found, for a document nobody is searching. */
export const NOTHING_FOUND: MawyFound = { total: 0, at: new Map() };

/** Every match in what [blocks] draw, numbered in reading order. */
export function findInDocument(
  blocks: readonly MdBlock[],
  query: string,
  matchCase: boolean
): MawyFound {
  if (!query) {
    return NOTHING_FOUND;
  }

  const found: MawyFound = { total: 0, at: new Map() };

  searchBlocks(blocks, query, matchCase, found);

  return found;
}

function searchBlocks(
  blocks: readonly MdBlock[],
  query: string,
  matchCase: boolean,
  into: MawyFound
): void {
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        searchInline(block.children, query, matchCase, into);
        break;

      case 'blockquote':
      case 'containerDirective':
        searchBlocks(block.children, query, matchCase, into);
        break;

      case 'list':
        for (const item of block.children) {
          searchBlocks(item.children, query, matchCase, into);
        }

        break;

      case 'table':
        for (const row of block.children) {
          for (const cell of row.children) {
            searchInline(cell.children, query, matchCase, into);
          }
        }

        break;

      case 'definitionList':
        for (const entry of block.children) {
          if (entry.type === 'definitionTerm') {
            searchInline(entry.children, query, matchCase, into);
          } else {
            searchBlocks(entry.children, query, matchCase, into);
          }
        }

        break;

      case 'leafDirective':
        searchInline(block.children, query, matchCase, into);
        break;

      // A code block is left out on purpose: it is drawn by the highlighter as
      // its own spans, and cutting a mark into those would mean cutting every
      // one of them. The rest — a raw HTML block, a rule, a footnote written
      // out at the end of the page — draws nothing this can point at either.
      default:
        break;
    }
  }
}

function searchInline(
  nodes: readonly MdInline[],
  query: string,
  matchCase: boolean,
  into: MawyFound
): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
      case 'inlineCode': {
        const matches = findMatches(node.value, query, matchCase);

        if (matches.length) {
          into.at.set(
            node,
            matches.map((match, at) => ({ ...match, index: into.total + at }))
          );
          into.total += matches.length;
        }

        break;
      }

      case 'emphasis':
      case 'strong':
      case 'delete':
      case 'link':
      case 'textDirective':
        searchInline(node.children, query, matchCase, into);
        break;

      // An image's alt text, a footnote's number, a piece of raw inline HTML:
      // none of them is prose the reader is reading.
      default:
        break;
    }
  }
}
