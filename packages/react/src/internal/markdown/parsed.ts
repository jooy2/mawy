/**
 * The same document, read once.
 *
 * The editor asks about the document from all over: which toolbar buttons are
 * lit, whether the caret is in a table or a fence, what the key just pressed
 * should do. Every one of those questions starts from the text, and each used
 * to read all of it, which came to eight or eleven parses for a key and five for
 * an arrow, of a text that had not changed since the last one.
 *
 * So the last few readings are kept. Four, because a key is the text before it
 * and the text after it, and each of those may be asked for with the options an
 * application gave and with none. A tree that comes out of here is shared with
 * everything else that asked, so nothing may change one, which is why this is
 * not what `parseMarkdown` does: that one is exported, and a tree handed to an
 * application is the application's.
 *
 * What it costs is the kept trees staying in memory after the editor is gone,
 * until something else is read. A server keeps none of them, because what it
 * renders for one visitor has no business outliving the request.
 */
import type { MdDocument } from './ast.js';
import { parseMarkdown, withDefaults, type MarkdownOptions } from './parse.js';

const KEPT = 4;

/** The readings kept, the latest first. */
const kept: { source: string; key: string; document: MdDocument }[] = [];

export function documentOf(source: string, options: MarkdownOptions = {}): MdDocument {
  if (typeof window === 'undefined') {
    return parseMarkdown(source, options);
  }

  const key = JSON.stringify(withDefaults(options));
  const at = kept.findIndex((entry) => entry.key === key && entry.source === source);

  if (at !== -1) {
    const [entry] = kept.splice(at, 1);

    kept.unshift(entry);

    return entry.document;
  }

  const document = parseMarkdown(source, options);

  kept.unshift({ source, key, document });
  kept.length = Math.min(kept.length, KEPT);

  return document;
}
