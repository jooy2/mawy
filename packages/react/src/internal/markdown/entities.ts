/**
 * Character references, decoded.
 *
 * Markdown says `&amp;` is an ampersand, and a viewer that shows the five
 * letters instead has not read the document. The obvious way to decode one is
 * to hand it to the DOM — `textarea.innerHTML = …` — and that is exactly the
 * way this must not be done: the parser is the half of the library with no
 * document to reach for, and an HTML round trip inside it would put an element
 * between untrusted input and the tree.
 *
 * So it is a table. Not all 2,231 of HTML's named references — a Markdown
 * document that needs `&angmsdaa;` can write the character — but the ones that
 * turn up in prose, plus the numeric forms, which are the general escape hatch.
 */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  dagger: '†',
  Dagger: '‡',
  permil: '‰',
  prime: '′',
  Prime: '″',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  minus: '−',
  ne: '≠',
  le: '≤',
  ge: '≥',
  asymp: '≈',
  infin: '∞',
  sum: '∑',
  prod: '∏',
  radic: '√',
  int: '∫',
  part: '∂',
  micro: 'µ',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  sect: '§',
  para: '¶',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  lArr: '⇐',
  rArr: '⇒',
  hArr: '⇔',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  pi: 'π',
  sigma: 'σ',
  omega: 'ω',
  Delta: 'Δ',
  Sigma: 'Σ',
  Omega: 'Ω',
  check: '✓',
  cross: '✗',
  star: '☆',
  starf: '★',
  heart: '♥',
  spades: '♠',
  clubs: '♣',
  diams: '♦'
};

/**
 * A code point that is not allowed to come back out of a numeric reference.
 *
 * `&#0;` is the interesting one: HTML replaces it with U+FFFD rather than with
 * a NUL, and a NUL that survived would be a character no renderer has a
 * sensible answer for. Surrogates and out-of-range values get the same
 * treatment for the same reason.
 */
function fromCodePoint(code: number): string {
  if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return '�';
  }

  return String.fromCodePoint(code);
}

const REFERENCE = /&(?:#[Xx]([\da-fA-F]+)|#(\d+)|([A-Za-z][A-Za-z\d]{1,31}));/g;

/**
 * Every character reference in a string, replaced by what it stands for.
 *
 * An `&` that does not begin a reference this table knows is left exactly as it
 * was written, which is what the Markdown specification asks for: `AT&T` is
 * three letters, an ampersand and one more letter, not an error.
 */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) {
    return text;
  }

  return text.replace(REFERENCE, (match, hex, dec, name) => {
    if (hex) {
      return fromCodePoint(Number.parseInt(hex, 16));
    }

    if (dec) {
      return fromCodePoint(Number.parseInt(dec, 10));
    }

    return NAMED[name] ?? match;
  });
}
