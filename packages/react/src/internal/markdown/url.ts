/**
 * What a link is allowed to point at.
 *
 * This is not part of the raw-HTML question and is not switched off with it. A
 * `[click](javascript:…)` is written in plain Markdown, with no HTML anywhere
 * near it, so a viewer that only guarded its HTML path would hand a document
 * the page it is embedded in. The check runs on every URL the parser produces,
 * always.
 */

/**
 * The schemes a document may name.
 *
 * An allowlist rather than a list of the bad ones: `javascript:` and
 * `vbscript:` are the two everybody thinks of, and the reason they are not what
 * is written here is that the next one will not be on anybody's list either.
 */
const SAFE_SCHEMES = new Set([
  'http',
  'https',
  'mailto',
  'tel',
  'sms',
  'ftp',
  'ftps',
  'irc',
  'ircs',
  'xmpp',
  'news',
  'nntp',
  'matrix'
]);

/** `data:` is allowed for images, and only for the types a browser draws. */
const SAFE_IMAGE_DATA = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon|svg\+xml)[;,]/i;

/**
 * Whitespace and control characters, which a browser drops before it resolves a
 * URL and a naive test does not. A `javascript:` with a newline inside the word
 * is the reason this exists.
 */
const IGNORED = /[\s\p{Cc}]/gu;

/**
 * A scheme, if the URL has one at the front.
 *
 * Everything before the first colon, but only when the colon comes before the
 * first `/`, `?` or `#` — otherwise `README.md#a:b` would be read as a scheme
 * of `README.md#a`.
 */
function schemeOf(url: string): string | null {
  const colon = url.indexOf(':');

  if (colon < 1) {
    return null;
  }

  const before = url.slice(0, colon);

  if (/[/?#]/.test(before) || !/^[A-Za-z][A-Za-z\d+.-]*$/.test(before)) {
    return null;
  }

  return before.toLowerCase();
}

/**
 * Whether a URL points somewhere relative to the document that wrote it.
 *
 * The three kinds of address that are *not*, and why each is left alone:
 *
 * - One with a scheme — `https:`, `mailto:`, `data:` — already says where it
 *   is. Nothing about the document it was written in changes that.
 * - One starting with `#` is a place in this document. Resolving it would send
 *   a link to a heading somewhere else entirely.
 * - One starting with `//` is missing only its scheme, which the page supplies.
 *   It is somewhere else, not somewhere near the document.
 *
 * Everything else — `a.png`, `./guide.md`, `../up.md#anchor`, `/docs/a.png` —
 * means nothing on its own. A browser resolves it against the address of the
 * page, which is the application's page and not the document's, and that is
 * exactly the case `MawyUrlResolver` exists for.
 */
export function isRelativeUrl(url: string): boolean {
  const trimmed = url.trim();

  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return false;
  }

  return schemeOf(trimmed.replace(IGNORED, '')) === null;
}

/**
 * A URL the renderer will put in an `href`, or `null` if it will not.
 *
 * `null` rather than `'#'` or the empty string on purpose: the renderer draws
 * the link's text without a link around it, so a reader sees the words the
 * author wrote and no control that does nothing.
 */
export function safeUrl(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  const scheme = schemeOf(trimmed.replace(IGNORED, ''));

  // No scheme at all is a relative URL — a path, a fragment, a query — and it
  // resolves against the page. Nothing to allow or refuse.
  if (scheme === null) {
    return trimmed;
  }

  return SAFE_SCHEMES.has(scheme) ? trimmed : null;
}

/**
 * The same, for an image's `src`.
 *
 * Wider by exactly one thing: an inline `data:` image. A document that carries
 * its own illustrations is a real and common thing — it is most of the point of
 * a Markdown file being one file — and an image data URL cannot execute. The
 * media type is checked so that `data:text/html` cannot arrive through an
 * `<img>` that some later renderer turns into a frame.
 */
export function safeImageUrl(url: string): string | null {
  const trimmed = url.trim();

  if (SAFE_IMAGE_DATA.test(trimmed.replace(IGNORED, ''))) {
    return trimmed;
  }

  return safeUrl(trimmed);
}

/**
 * The bytes a `data:` image carries, or `null` where it is not one this file
 * allows or its payload cannot be read.
 *
 * Base64 has the whitespace a browser ignores taken out first, the way a browser
 * reads it; anything else is percent-decoded, which is how an `svg+xml` image is
 * usually written.
 */
export function dataImageBytes(
  url: string
): { type: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const trimmed = url.trim();

  if (!SAFE_IMAGE_DATA.test(trimmed.replace(IGNORED, ''))) {
    return null;
  }

  const comma = trimmed.indexOf(',');

  // No comma is no payload, and what would be read as one is the address.
  if (comma === -1) {
    return null;
  }
  const head = trimmed.slice(5, comma).replace(IGNORED, '');
  const payload = trimmed.slice(comma + 1);
  const type = head.split(';')[0].toLowerCase();

  try {
    if (/;base64$/i.test(head)) {
      return {
        type,
        bytes: Uint8Array.from(atob(payload.replace(IGNORED, '')), (c) => c.charCodeAt(0))
      };
    }

    return { type, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
  } catch {
    return null;
  }
}
