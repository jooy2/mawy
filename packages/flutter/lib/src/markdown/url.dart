/// What a link is allowed to point at.
///
/// A `[click](javascript:…)` is written in plain Markdown, so the check runs on
/// every URL the parser produces, always. It matters here for the same reason
/// it matters in a browser and for one more: a Flutter application opening a
/// URL hands it to the platform, and the platform will open whatever it is
/// given.
library;

/// The schemes a document may name.
///
/// An allowlist rather than a list of the bad ones: `javascript:` and
/// `vbscript:` are the two everybody thinks of, and the reason they are not
/// what is written here is that the next one will not be on anybody's list
/// either.
const Set<String> _safeSchemes = <String>{
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
  'matrix',
};

/// `data:` is allowed for images, and only for the types anything draws.
final RegExp _safeImageData = RegExp(
  r'^data:image/(?:png|jpe?g|gif|webp|avif|bmp|x-icon|svg\+xml)[;,]',
  caseSensitive: false,
);

/// Whitespace and control characters, which are dropped before a URL is
/// resolved and which a naive test does not. A `javascript:` with a newline
/// inside the word is the reason this exists.
///
/// The ranges are written out rather than reached for as a Unicode property:
/// they are the C0 block, `DEL` and the C1 block, which is the whole of that
/// category, and naming them costs nothing and needs no flag.
final RegExp _ignored = RegExp(r'[\s\u0000-\u001f\u007f-\u009f]');

final RegExp _hasPath = RegExp(r'[/?#]');
final RegExp _isScheme = RegExp(r'^[A-Za-z][A-Za-z\d+.\-]*$');

/// A scheme, if the URL has one at the front.
///
/// Everything before the first colon, but only when the colon comes before the
/// first `/`, `?` or `#` — otherwise `README.md#a:b` would be read as a scheme
/// of `README.md#a`.
String? _schemeOf(String url) {
  final int colon = url.indexOf(':');

  if (colon < 1) {
    return null;
  }

  final String before = url.substring(0, colon);

  if (_hasPath.hasMatch(before) || !_isScheme.hasMatch(before)) {
    return null;
  }

  return before.toLowerCase();
}

/// A URL a link may point at, or `null` if it may not.
///
/// `null` rather than `'#'` or the empty string on purpose: the renderer draws
/// the link's text without a link around it, so a reader sees the words the
/// author wrote and no control that does nothing.
String? safeUrl(String url) {
  final String trimmed = url.trim();

  if (trimmed.isEmpty) {
    return null;
  }

  final String? scheme = _schemeOf(trimmed.replaceAll(_ignored, ''));

  // No scheme at all is a relative URL — a path, a fragment, a query — and it
  // resolves against wherever the document came from. Nothing to allow or
  // refuse.
  if (scheme == null) {
    return trimmed;
  }

  return _safeSchemes.contains(scheme) ? trimmed : null;
}

/// The same, for the picture an image points at.
///
/// Wider by exactly one thing: an inline `data:` image. A document that carries
/// its own illustrations is a real and common thing — it is most of the point
/// of a Markdown file being one file — and an image data URL cannot execute.
/// The media type is checked so that `data:text/html` cannot arrive through an
/// image.
String? safeImageUrl(String url) {
  final String trimmed = url.trim();

  if (_safeImageData.hasMatch(trimmed.replaceAll(_ignored, ''))) {
    return trimmed;
  }

  return safeUrl(trimmed);
}
