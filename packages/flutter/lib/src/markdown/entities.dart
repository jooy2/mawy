/// Character references, decoded.
///
/// Markdown says `&amp;` is an ampersand, and a viewer that shows the five
/// letters instead has not read the document. The obvious way to decode one in
/// a browser is to hand it to the DOM, and that is exactly the way the React
/// package must not do it — so it is a table there, and the same table here,
/// where there is no DOM to be tempted by in the first place.
///
/// Not all 2,231 of HTML's named references — a Markdown document that needs
/// `&angmsdaa;` can write the character — but the ones that turn up in prose,
/// plus the numeric forms, which are the general escape hatch.
library;

const Map<String, String> _named = <String, String>{
  'amp': '&',
  'lt': '<',
  'gt': '>',
  'quot': '"',
  'apos': "'",
  'nbsp': ' ',
  'ensp': ' ',
  'emsp': ' ',
  'thinsp': ' ',
  'copy': '©',
  'reg': '®',
  'trade': '™',
  'hellip': '…',
  'mdash': '—',
  'ndash': '–',
  'lsquo': '‘',
  'rsquo': '’',
  'ldquo': '“',
  'rdquo': '”',
  'laquo': '«',
  'raquo': '»',
  'middot': '·',
  'bull': '•',
  'dagger': '†',
  'Dagger': '‡',
  'permil': '‰',
  'prime': '′',
  'Prime': '″',
  'deg': '°',
  'plusmn': '±',
  'times': '×',
  'divide': '÷',
  'minus': '−',
  'ne': '≠',
  'le': '≤',
  'ge': '≥',
  'asymp': '≈',
  'infin': '∞',
  'sum': '∑',
  'prod': '∏',
  'radic': '√',
  'int': '∫',
  'part': '∂',
  'micro': 'µ',
  'euro': '€',
  'pound': '£',
  'yen': '¥',
  'cent': '¢',
  'sect': '§',
  'para': '¶',
  'larr': '←',
  'uarr': '↑',
  'rarr': '→',
  'darr': '↓',
  'harr': '↔',
  'lArr': '⇐',
  'rArr': '⇒',
  'hArr': '⇔',
  'alpha': 'α',
  'beta': 'β',
  'gamma': 'γ',
  'delta': 'δ',
  'pi': 'π',
  'sigma': 'σ',
  'omega': 'ω',
  'Delta': 'Δ',
  'Sigma': 'Σ',
  'Omega': 'Ω',
  'check': '✓',
  'cross': '✗',
  'star': '☆',
  'starf': '★',
  'heart': '♥',
  'spades': '♠',
  'clubs': '♣',
  'diams': '♦',
};

/// A code point that is not allowed to come back out of a numeric reference.
///
/// `&#0;` is the interesting one: HTML replaces it with U+FFFD rather than with
/// a NUL, and a NUL that survived would be a character no renderer has a
/// sensible answer for. Surrogates and out-of-range values get the same
/// treatment for the same reason.
String _fromCodePoint(int code) {
  if (code == 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return '\u{fffd}';
  }

  return String.fromCharCode(code);
}

final RegExp _reference = RegExp(r'&(?:#[Xx]([\da-fA-F]+)|#(\d+)|([A-Za-z][A-Za-z\d]{1,31}));');

/// Every character reference in [text], replaced by what it stands for.
///
/// An `&` that does not begin a reference this table knows is left exactly as
/// it was written, which is what the Markdown specification asks for: `AT&T` is
/// three letters, an ampersand and one more letter, not an error.
String decodeEntities(String text) {
  if (!text.contains('&')) {
    return text;
  }

  return text.replaceAllMapped(_reference, (Match match) {
    final String? hex = match.group(1);
    final String? dec = match.group(2);
    final String? name = match.group(3);

    if (hex != null) {
      return _fromCodePoint(int.parse(hex, radix: 16));
    }

    if (dec != null) {
      return _fromCodePoint(int.parse(dec));
    }

    return _named[name] ?? match.group(0)!;
  });
}
