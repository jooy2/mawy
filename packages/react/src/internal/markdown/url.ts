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
