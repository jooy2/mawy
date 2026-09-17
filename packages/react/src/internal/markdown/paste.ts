/**
 * HTML, read back as Markdown.
 *
 * This is not the renderer run backwards, and it is worth saying why, because
 * the library goes to some trouble elsewhere to insist there is no such thing.
 * A DOM-to-Markdown serialiser over Mawy's *own* drawing would be a second
 * opinion about what a document means, and two opinions disagree. This is the
 * other direction entirely: markup from somewhere else — a web page, a word
 * processor, another editor — arriving on the clipboard, and being read once,
 * for what can be made of it. Nothing round-trips through here.
 *
 * So it is allowed to be lossy, and it is. A `<span style="color:red">` is its
 * text; a `<video>` is nothing; an attribute nobody named is gone. What comes
 * out is Markdown, and Markdown is the whole of what the document can hold.
 *
 * `DOMParser` does the parsing, for the same reason the sanitiser uses it: the
 * only thing that agrees with a browser about what a piece of HTML means is a
 * browser, and the document it builds is inert — no scripts, no loads.
 */

import { picturesInRtf } from '../rtf.js';
import { dataImageBytes, safeImageUrl, safeUrl } from './url.js';

/**
 * How a piece of markup is being read.
 *
 * `alts` is whether a picture with no address anybody can reach is written as
 * its description. That is right for a paste, where a `javascript:` image is the
 * words it was given, and wrong for the question `markupHasContent` asks, where
 * a description Chromium wrote for a `blob:` image is not something the markup
 * had to say.
 */
interface Reading {
  alts: boolean;
  /**
   * Where the `data:` pictures go, when they are being taken out to be uploaded
   * rather than written into the document as the bytes they are. See
   * `pasteFromHtml`.
   */
  inline: { url: string; alt: string }[] | null;
  /**
   * The bytes of pictures whose `<img>` points nowhere a page can reach, read
   * out of the RTF that came with the markup, by the element each belongs to.
   * See `pasteFromHtml`.
   */
  recovered?: ReadonlyMap<Element, string>;
}

/**
 * Where a picture taken out of the markup was, until the markup is finished.
 *
 * The object replacement character, which is what it means: something stood
 * here that is not text. Offsets into the Markdown cannot be counted while it is
 * being built, because the whitespace is tidied once it is whole — so the place
 * is marked in the string and read off at the end. The same character arriving
 * in the markup — as text, in code, in an address or a description — is dropped
 * wherever the markup is read, so every one left is one of these.
 */
const STOOD = '\uFFFC';

/** What the markup said, with the marker taken out of it wherever it was written. */
const unmarked = (text: string | null): string => (text ?? '').replaceAll(STOOD, '');

/** A `data:` picture taken out of pasted markup, and where it stood in the Markdown. */
export interface MawyInlineImage {
  at: number;
  url: string;
  alt: string;
}

/** Elements that stand on their own rather than sitting inside a sentence. */
const BLOCKS = new Set(
  (
    'address article aside blockquote details div dl dd dt fieldset figcaption figure footer ' +
    'form h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table ul'
  )
    .split(' ')
    .map((name) => name.toUpperCase())
);

/** Elements whose contents are not prose and are not wanted. */
const DROPPED = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'IFRAME',
  'OBJECT',
  'SVG',
  'MATH'
]);

/**
 * An element's name, in the one case everything here is written in.
 *
 * `tagName` is upper case for HTML and is the source's own case for anything
 * else — an `<svg>` copied out of a page answers `svg`, which matched none of
 * the names above and fell through to "unknown container, keep what is inside
 * it". So the drawing's labels arrived in the document as prose.
 */
function tagOf(element: Element): string {
  return element.tagName.toUpperCase();
}

/* -------------------------------------------------------------------------
 * Text
 * ---------------------------------------------------------------------- */

/**
 * Characters that would mean something they were not written to mean.
 *
 * Everything a reader typed is text, and text that happens to contain an
 * asterisk is text containing an asterisk rather than the start of emphasis.
 * The list is deliberately the punctuation Markdown reads *inside* a line;
 * what a line reads at its start is handled where a paragraph is built,
 * because escaping every full stop after a number would be unreadable.
 */
function escapeText(text: string): string {
  return text.replace(/[\\`*_[\]<>~|]/g, '\\$&');
}

/** A paragraph that would have opened a block it was not meant to. */
function guardStart(text: string): string {
  return text.replace(/^(\s*)(#{1,6}\s|>|[-+*]\s|\d{1,9}[.)]\s|={2,}\s*$|-{2,}\s*$)/, '$1\\$2');
}

/** The longest run of a character in a string, for choosing a fence. */
function longestRun(text: string, character: string): number {
  let longest = 0;
  let run = 0;

  for (const each of text) {
    run = each === character ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  return longest;
}

/** A code span, fenced with enough backticks to hold what is inside it. */
function codeSpan(text: string): string {
  const value = text.replace(/\s+/g, ' ');

  if (!value) {
    return '';
  }

  const fence = '`'.repeat(longestRun(value, '`') + 1);
  const pad = value.startsWith('`') || value.endsWith('`') ? ' ' : '';

  return `${fence}${pad}${value}${pad}${fence}`;
}

/**
 * A marker put around some text, with the spaces moved outside it.
 *
 * `** bold **` is four asterisks and a word, because a delimiter run with
 * whitespace against its inside opens nothing. The spaces belong to the
 * sentence rather than to the emphasis, so that is where they go.
 */
function wrap(marker: string, inside: string): string {
  const core = inside.trim();

  if (!core) {
    return inside;
  }

  const lead = inside.slice(0, inside.length - inside.trimStart().length);
  const tail = inside.slice(inside.trimEnd().length);

  return `${lead}${marker}${core}${marker}${tail}`;
}

/* -------------------------------------------------------------------------
 * Inline
 * ---------------------------------------------------------------------- */

function inlineOf(nodes: Iterable<Node>, reading: Reading): string {
  let out = '';

  for (const node of nodes) {
    if (node.nodeType === 3) {
      // HTML collapses its whitespace and so does this: the line breaks in the
      // markup are the author's typing, not the document's.
      out += escapeText(unmarked((node as Text).data).replace(/\s+/g, ' '));
      continue;
    }

    if (node.nodeType !== 1) {
      continue;
    }

    const element = node as HTMLElement;
    const inside = () => inlineOf(element.childNodes, reading);

    switch (tagOf(element)) {
      case 'BR':
        out += '  \n';
        break;

      case 'STRONG':
      case 'B':
        out += wrap('**', inside());
        break;

      case 'EM':
      case 'I':
        out += wrap('*', inside());
        break;

      case 'DEL':
      case 'S':
      case 'STRIKE':
        out += wrap('~~', inside());
        break;

      case 'CODE':
      case 'KBD':
      case 'SAMP':
        out += codeSpan(unmarked(element.textContent));
        break;

      case 'A': {
        const url = safeUrl(unmarked(element.getAttribute('href')));
        const label = inside();

        // A link nobody may follow is the words it was written with. That is
        // the same answer the parser gives a `javascript:` link in Markdown.
        out += url && label.trim() ? `[${label}](${url})` : label;
        break;
      }

      case 'IMG': {
        const url = safeImageUrl(unmarked(element.getAttribute('src')));
        const alt = escapeText(unmarked(element.getAttribute('alt')));

        const bytes =
          url && dataImageBytes(url) ? url : url ? null : reading.recovered?.get(element);

        if (bytes && reading.inline) {
          reading.inline.push({ url: bytes, alt: unmarked(element.getAttribute('alt')) });
          out += STOOD;
          break;
        }

        out += url ? `![${alt}](${url})` : reading.alts ? alt : '';
        break;
      }

      default:
        if (!DROPPED.has(tagOf(element))) {
          out += inside();
        }
    }
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Blocks
 * ---------------------------------------------------------------------- */

/** Every line after the first, moved in by `pad`. */
function hang(text: string, pad: string): string {
  return text.split('\n').join(`\n${pad}`);
}

/** Every line, with something in front of it. */
function prefix(text: string, marker: string): string {
  return text
    .split('\n')
    .map((line) => (line ? `${marker}${line}` : marker.trimEnd()))
    .join('\n');
}

/**
 * The blocks of a container, in order.
 *
 * Anything inline between two blocks is a paragraph of its own, which is what
 * a `<div>` with a sentence loose inside it turns out to be.
 */
function blocksOf(parent: Node, reading: Reading): string[] {
  const parts: string[] = [];
  let loose: Node[] = [];

  const flush = () => {
    const text = guardStart(inlineOf(loose, reading).trim());

    if (text) {
      parts.push(text);
    }

    loose = [];
  };

  for (const node of parent.childNodes) {
    if (node.nodeType === 1 && BLOCKS.has(tagOf(node as HTMLElement))) {
      flush();

      const block = blockOf(node as HTMLElement, reading);

      if (block) {
        parts.push(block);
      }

      continue;
    }

    loose.push(node);
  }

  flush();

  return parts;
}

/** A list item's own blocks, kept tight where a nested list follows. */
function joinItem(parts: string[]): string {
  return parts.reduce(
    (out, part, index) =>
      index === 0 ? part : `${out}${/^(?:[-+*] |\d{1,9}[.)] )/.test(part) ? '\n' : '\n\n'}${part}`,
    ''
  );
}

function listOf(element: HTMLElement, reading: Reading): string {
  const ordered = tagOf(element) === 'OL';
  const from = Number.parseInt(element.getAttribute('start') ?? '1', 10) || 1;
  const items = [...element.children].filter((child) => tagOf(child) === 'LI');

  return items
    .map((item, index) => {
      const marker = ordered ? `${from + index}. ` : '- ';
      const body = joinItem(blocksOf(item, reading)) || '';

      return `${marker}${hang(body, ' '.repeat(marker.length))}`.trimEnd();
    })
    .join('\n');
}

function tableOf(element: HTMLElement, reading: Reading): string {
  const rows = [...element.querySelectorAll('tr')].map((row) =>
    [...row.children].map((cell) =>
      inlineOf(cell.childNodes, reading).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim()
    )
  );

  if (!rows.length) {
    return '';
  }

  const width = Math.max(...rows.map((row) => row.length));
  const line = (row: string[]) =>
    `| ${Array.from({ length: width }, (_, at) => row[at] ?? '').join(' | ')} |`;

  return [
    line(rows[0]),
    `| ${Array.from({ length: width }, () => '---').join(' | ')} |`,
    ...rows.slice(1).map(line)
  ].join('\n');
}

function preOf(element: HTMLElement): string {
  const inner = element.querySelector('code');
  const value = unmarked((inner ?? element).textContent);
  const language =
    /(?:language|lang|highlight)-([\w+#.-]+)/.exec(inner?.className ?? '')?.[1] ?? '';
  const fence = '`'.repeat(Math.max(3, longestRun(value, '`') + 1));

  return `${fence}${language}\n${value.replace(/\n+$/, '')}\n${fence}`;
}

function blockOf(element: HTMLElement, reading: Reading): string {
  if (DROPPED.has(tagOf(element))) {
    return '';
  }

  const heading = /^H([1-6])$/.exec(tagOf(element));

  if (heading) {
    const text = inlineOf(element.childNodes, reading).replace(/\s+/g, ' ').trim();

    return text ? `${'#'.repeat(Number(heading[1]))} ${text}` : '';
  }

  switch (tagOf(element)) {
    case 'HR':
      return '---';

    case 'PRE':
      return preOf(element);

    case 'UL':
    case 'OL':
      return listOf(element, reading);

    case 'TABLE':
      return tableOf(element, reading);

    case 'BLOCKQUOTE':
      return prefix(blocksOf(element, reading).join('\n\n'), '> ');

    case 'P':
    case 'DT':
      return guardStart(inlineOf(element.childNodes, reading).trim());

    case 'DD':
      return prefix(blocksOf(element, reading).join('\n\n'), '  ').trimStart();

    default:
      return blocksOf(element, reading).join('\n\n');
  }
}

/**
 * Markdown for a piece of HTML, or `''` where there is nothing to be made of it.
 *
 * `''` is also the answer where there is no `DOMParser` to read it with — a
 * server render — and the caller falls back to the plain text the clipboard
 * carried alongside, which is what it would have pasted anyway.
 */
export function markdownFromHtml(html: string): string {
  return read(html, { alts: true, inline: null });
}

/**
 * Whether this markup is a browser's wrapper around a document it was shown as
 * plain text, rather than a code block somebody copied off a page.
 *
 * A browser given a `text/plain` file draws it inside one `<pre>` and puts that
 * on the clipboard as its HTML. A `<pre>` is preformatted and a fenced block is
 * what it means, so a Markdown file copied out of one arrived as a fence around
 * the whole document — every heading and every list inside it, and none of them
 * anything any more.
 *
 * The wrapper has nothing in it but the text of the file. A code block on a
 * page is written `<pre><code>`, with whatever coloured it leaving classes
 * behind, and it is one thing among the others that were copied with it. So:
 * the body is that `<pre>` and nothing else, the `<pre>` holds no element and
 * no class of its own, and what is in it is the whole of what the clipboard
 * carried as text.
 */
export function wrappedPlainText(html: string, plain: string): boolean {
  if (typeof DOMParser === 'undefined' || !html.trim() || !plain.trim()) {
    return false;
  }

  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const only = body.children.length === 1 ? body.children[0] : null;

  return (
    only?.tagName === 'PRE' &&
    only.children.length === 0 &&
    !only.className &&
    (only.textContent ?? '').trim() === plain.trim() &&
    (body.textContent ?? '').trim() === plain.trim()
  );
}

/**
 * The pictures of the RTF, for the `<img>` elements of the markup, where every
 * `<img>` has one.
 *
 * Which picture belongs to which element is only known by counting them in the
 * order both write them, so a count that does not match takes none: a picture
 * in the wrong place is worse than one left out. See `picturesInRtf`.
 */
function recoveredPictures(body: HTMLElement, rtf: string): ReadonlyMap<Element, string> {
  const elements = [...body.querySelectorAll('img')];
  const found = new Map<Element, string>();

  // Read only for a picture that needs it. RTF is the whole document again, and
  // a clipboard whose pictures already say where they are, or carry their own
  // bytes, has nothing in it this could add.
  if (!elements.some((element) => !safeImageUrl(unmarked(element.getAttribute('src'))))) {
    return found;
  }

  const pictures = picturesInRtf(rtf);

  if (pictures.length === elements.length) {
    elements.forEach((element, index) => {
      const picture = pictures[index];

      if (picture) {
        found.set(element, picture);
      }
    });
  }

  return found;
}

/**
 * Markdown for a piece of HTML, with its `data:` pictures taken out and said
 * where they stood.
 *
 * What a paste reads when the application has said where an image goes. A
 * `data:` address is not an address but the picture's bytes, and whether bytes
 * belong in the document is the decision `onUploadImage` exists to take away
 * from a text editor — so they are put through it, the same as the file a
 * screenshot arrives as, and written where they were once it has answered. With
 * nowhere to upload them they stay what they were, which is `markdownFromHtml`.
 *
 * `rtf` is the same clipboard's RTF, where there was one. A word processor
 * writes a picture into its markup as an `<img>` pointing at a file on the
 * machine that copied it, and into its RTF as the picture's bytes, so a picture
 * whose `<img>` points nowhere a page can reach is read out of the RTF and taken
 * out like a `data:` one.
 */
export function pasteFromHtml(
  html: string,
  rtf = ''
): { markdown: string; images: MawyInlineImage[] } {
  const found: { url: string; alt: string }[] = [];
  const marked = read(html, { alts: true, inline: found }, rtf);
  const images: MawyInlineImage[] = [];
  let markdown = '';
  let from = 0;

  for (let at = marked.indexOf(STOOD); at !== -1; at = marked.indexOf(STOOD, from)) {
    markdown += marked.slice(from, at);
    from = at + 1;

    const image = found[images.length];

    if (image) {
      images.push({ at: markdown.length, ...image });
    }
  }

  return { markdown: markdown + marked.slice(from), images };
}

/**
 * Whether markup has anything of its own to paste: words, or a picture it says
 * where to find.
 *
 * What a clipboard carrying an image file *and* markup is asked, because the
 * markup is usually the better answer and sometimes is no answer at all. An
 * image copied out of a web page comes with an `<img>` that already says where
 * it lives, and uploading it again is work nobody asked for. An image copied in
 * Chromium from anywhere it was drawn from a `blob:` address comes with an
 * `<img>` pointing at that address, which no other page can reach — and read as
 * markup that is a picture's description and no picture, and the file that was
 * on the clipboard the whole time is never uploaded.
 */
export function markupHasContent(html: string): boolean {
  // A `data:` picture is taken out rather than counted: this is only asked
  // where there is somewhere to upload one, and there it is bytes to upload
  // rather than an address the markup had to give.
  return read(html, { alts: false, inline: [] }).replaceAll(STOOD, '').trim() !== '';
}

function read(html: string, reading: Reading, rtf = ''): string {
  if (typeof DOMParser === 'undefined' || !html.trim()) {
    return '';
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');

  if (rtf && reading.inline) {
    reading.recovered = recoveredPictures(parsed.body, rtf);
  }

  return blocksOf(parsed.body, reading)
    .join('\n\n')
    .replace(/[ \t]+$/gm, (spaces) => (spaces.length >= 2 ? '  ' : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
