/**
 * The pictures a document points at.
 *
 * An application that stores what `onUploadImage` is handed is left holding
 * files a document stopped pointing at, and the editor does not say when that
 * happens, because a picture leaving the document is not a file being given up:
 * `Mod`+`Z` puts it back, a cut picture is pasted somewhere else, and the same
 * address copied into a second document is the same file in two places. What
 * can be said for certain is which pictures one document points at, and that is
 * what this answers, so the files nothing points at are found by comparing it
 * with what was stored, across every saved document, at the application's own
 * moment for it.
 *
 * Generous on purpose. A file kept that nothing needs costs its bytes, and one
 * given up that something still points at is a picture missing from a page. So
 * an `<img>` in raw HTML is read whatever the `html` policy would do with it and
 * in the Flutter package, which draws none of it, and one inside an HTML comment
 * is read too.
 */

import type { MdDocument, MdNode } from './ast.js';
import { decodeEntities } from './entities.js';

/**
 * An `<img>` with every attribute it was written with, by the same rule for an
 * attribute the inline parser holds a tag to. Its name in any case, and
 * `<image>` as well, which a browser reads as the same element.
 */
const IMG =
  /<im(?:g|age)(?=[\s/>])((?:\s+[A-Za-z_:][A-Za-z\d_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi;

/** One attribute of those, and its value in whichever of the three ways it was quoted. */
const ATTRIBUTE =
  /\s+([A-Za-z_:][A-Za-z\d_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * The `src` of every `<img>` in a piece of raw HTML.
 *
 * The first `src` on a tag is the one a browser keeps, and its references are
 * read the way a Markdown destination's are. Where HTML would also read a
 * reference with no semicolon, the address is listed as it was written.
 */
function sourcesIn(html: string, into: Set<string>): void {
  for (const tag of html.matchAll(IMG)) {
    for (const attribute of tag[1].matchAll(ATTRIBUTE)) {
      if (attribute[1].toLowerCase() !== 'src') {
        continue;
      }

      const url = decodeEntities(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');

      if (url) {
        into.add(url);
      }

      break;
    }
  }
}

function collect(nodes: readonly MdNode[], into: Set<string>): void {
  for (const node of nodes) {
    if (node.type === 'image') {
      if (node.url) {
        into.add(node.url);
      }

      continue;
    }

    if (node.type === 'html' || node.type === 'inlineHtml') {
      sourcesIn(node.value, into);

      continue;
    }

    // A container's label is a run of inlines beside its blocks rather than
    // one of them, and a picture can be written there as well as anywhere.
    if (node.type === 'containerDirective') {
      collect(node.label, into);
    }

    if ('children' in node) {
      collect(node.children as readonly MdNode[], into);
    }
  }
}

/**
 * Every address a document draws a picture from, each once, in the order the
 * document first gives it.
 *
 * The address as it is written, with its escapes and references read, and
 * before `resolveUrl`: which is the URL `onUploadImage` answered with, since
 * the editor writes that into the document and the parser reads it back out
 * unchanged. A picture in a footnote nothing refers to is not drawn and is not
 * listed, and neither is a `srcset`.
 *
 * ```ts
 * const kept = new Set(imageUrls(parseMarkdown(saved)));
 * const unused = uploaded.filter((url) => !kept.has(url));
 * ```
 */
export function imageUrls(document: MdDocument): string[] {
  const found = new Set<string>();

  collect(document.root.children, found);
  collect(document.footnotes, found);

  return [...found];
}
