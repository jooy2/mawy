/**
 * Raw HTML, made safe enough to put on the page.
 *
 * This is the one place in the library where a document's own markup becomes
 * elements, and everything about it is deliberately narrow. An allowlist of
 * element names, an allowlist of attributes per element, and every URL through
 * the same check a Markdown link gets. Anything not named is removed, so a tag
 * this file has never heard of cannot arrive by being new.
 *
 * The parsing is done by `DOMParser` rather than by a regular expression, and
 * that is not a convenience: HTML's error recovery is the attack surface, and
 * the only parser that agrees with the browser about what `<img src=x onerror
 * =alert(1)>` means is the browser's. `DOMParser` builds an inert document —
 * no scripts run, no images load — so the tree can be walked before any of it
 * is adopted into the page.
 */

import { safeImageUrl, safeUrl } from './url.js';

/** Elements a document may draw. Nothing that loads, frames or scripts. */
const ELEMENTS = new Set(
  (
    'a abbr b bdi bdo blockquote br caption cite code col colgroup dd del details dfn div dl dt ' +
    'em figcaption figure h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p pre q rp rt ruby s ' +
    'samp section small span strong sub summary sup table tbody td tfoot th thead time tr u ul ' +
    'var wbr'
  ).split(' ')
);

/**
 * Elements that go, and take their contents with them.
 *
 * Everything else this file does not recognise is *unwrapped* — the tag goes,
 * what the author wrote inside it stays — because losing a paragraph to one
 * unknown container would be worse than losing the container. These are the
 * ones whose contents are not prose: unwrapping a `<script>` would put its
 * source on the page as a line of visible text, which is not dangerous but is
 * not a document either.
 */
const DROPPED = new Set(
  (
    'script style iframe frame frameset object embed applet noscript template link meta base ' +
    'title head form input button select option textarea fieldset audio video canvas map area ' +
    'svg math portal dialog slot'
  ).split(' ')
);

/** Allowed on anything. `style` is not among them, and that is on purpose. */
const GLOBAL_ATTRIBUTES = new Set(['class', 'id', 'title', 'dir', 'lang']);

const ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'name']),
  // No `srcset`. It is a comma-separated list of URLs in one attribute value,
  // and one allowlist check over the whole string is not a check of each of
  // them — a candidate hidden after the first comma would go straight through.
  // Responsive images in a Markdown document are worth less than that hole.
  img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding']),
  ol: new Set(['start', 'reversed', 'type']),
  li: new Set(['value']),
  td: new Set(['colspan', 'rowspan', 'headers', 'align']),
  th: new Set(['colspan', 'rowspan', 'headers', 'scope', 'abbr', 'align']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  details: new Set(['open']),
  time: new Set(['datetime']),
  del: new Set(['cite', 'datetime']),
  ins: new Set(['cite', 'datetime']),
  q: new Set(['cite']),
  blockquote: new Set(['cite'])
};

/** Attributes whose value is a URL and therefore has to be checked as one. */
const URL_ATTRIBUTES = new Set(['href', 'src', 'cite']);

function allowedAttribute(tag: string, name: string): boolean {
  return GLOBAL_ATTRIBUTES.has(name) || Boolean(ATTRIBUTES[tag]?.has(name));
}

function scrub(element: Element): void {
  const tag = element.tagName.toLowerCase();

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();

    if (!allowedAttribute(tag, name)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (URL_ATTRIBUTES.has(name)) {
      const url = tag === 'img' ? safeImageUrl(attribute.value) : safeUrl(attribute.value);

      if (url === null) {
        element.removeAttribute(attribute.name);
      } else {
        element.setAttribute(attribute.name, url);
      }
    }
  }

  // A link that opens elsewhere hands the new page a handle on this one unless
  // it is told not to, and a document is not the right thing to trust with it.
  if (tag === 'a' && element.getAttribute('target')) {
    element.setAttribute('rel', 'noopener noreferrer');
  }
}

function walk(node: Node): void {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) {
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }

    const element = child as Element;
    const tag = element.tagName.toLowerCase();

    if (DROPPED.has(tag)) {
      element.remove();
      continue;
    }

    if (!ELEMENTS.has(tag)) {
      // The element goes; what the author wrote *inside* it stays. Dropping the
      // subtree with it would lose a paragraph to one unknown wrapper.
      //
      // Cleaned *before* it is unwrapped, and the order is the whole of it:
      // this loop walks a snapshot of the children taken on the way in, so
      // anything moved up into it afterwards is never visited. Unwrapping
      // first would let `<unknown><script>…</script></unknown>` through.
      walk(element);
      element.replaceWith(...element.childNodes);
      continue;
    }

    scrub(element);
    walk(element);
  }
}

/**
 * A fragment of a document's own HTML, with everything this file does not
 * recognise taken out of it.
 *
 * Returns `null` where there is no `DOMParser` to do the parsing — a server
 * render, most likely. The caller shows the markup as text there rather than
 * guessing, because a sanitiser that falls back to "pass it through" is not
 * a sanitiser.
 */
export function sanitizeHtml(html: string): string | null {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const parsed = new DOMParser().parseFromString(`<body>${html}`, 'text/html');

  walk(parsed.body);

  return parsed.body.innerHTML;
}
