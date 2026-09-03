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

import { safeImageUrl, safeUrl } from './url.js';

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

function inlineOf(nodes: Iterable<Node>): string {
  let out = '';

  for (const node of nodes) {
    if (node.nodeType === 3) {
      // HTML collapses its whitespace and so does this: the line breaks in the
      // markup are the author's typing, not the document's.
      out += escapeText((node as Text).data.replace(/\s+/g, ' '));
      continue;
    }

    if (node.nodeType !== 1) {
      continue;
    }

    const element = node as HTMLElement;
    const inside = () => inlineOf(element.childNodes);

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
        out += codeSpan(element.textContent ?? '');
        break;

      case 'A': {
        const url = safeUrl(element.getAttribute('href') ?? '');
        const label = inside();

        // A link nobody may follow is the words it was written with. That is
        // the same answer the parser gives a `javascript:` link in Markdown.
        out += url && label.trim() ? `[${label}](${url})` : label;
        break;
      }

      case 'IMG': {
        const url = safeImageUrl(element.getAttribute('src') ?? '');
        const alt = escapeText(element.getAttribute('alt') ?? '');

        out += url ? `![${alt}](${url})` : alt;
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
function blocksOf(parent: Node): string[] {
  const parts: string[] = [];
  let loose: Node[] = [];

  const flush = () => {
    const text = guardStart(inlineOf(loose).trim());

    if (text) {
      parts.push(text);
    }

    loose = [];
  };

  for (const node of parent.childNodes) {
    if (node.nodeType === 1 && BLOCKS.has(tagOf(node as HTMLElement))) {
      flush();

      const block = blockOf(node as HTMLElement);

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

function listOf(element: HTMLElement): string {
  const ordered = tagOf(element) === 'OL';
  const from = Number.parseInt(element.getAttribute('start') ?? '1', 10) || 1;
  const items = [...element.children].filter((child) => tagOf(child) === 'LI');

  return items
    .map((item, index) => {
      const marker = ordered ? `${from + index}. ` : '- ';
      const body = joinItem(blocksOf(item)) || '';

      return `${marker}${hang(body, ' '.repeat(marker.length))}`.trimEnd();
    })
    .join('\n');
}

function tableOf(element: HTMLElement): string {
  const rows = [...element.querySelectorAll('tr')].map((row) =>
    [...row.children].map((cell) =>
      inlineOf(cell.childNodes).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim()
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
  const value = (inner ?? element).textContent ?? '';
  const language =
    /(?:language|lang|highlight)-([\w+#.-]+)/.exec(inner?.className ?? '')?.[1] ?? '';
  const fence = '`'.repeat(Math.max(3, longestRun(value, '`') + 1));

  return `${fence}${language}\n${value.replace(/\n+$/, '')}\n${fence}`;
}

function blockOf(element: HTMLElement): string {
  if (DROPPED.has(tagOf(element))) {
    return '';
  }

  const heading = /^H([1-6])$/.exec(tagOf(element));

  if (heading) {
    const text = inlineOf(element.childNodes).replace(/\s+/g, ' ').trim();

    return text ? `${'#'.repeat(Number(heading[1]))} ${text}` : '';
  }

  switch (tagOf(element)) {
    case 'HR':
      return '---';

    case 'PRE':
      return preOf(element);

    case 'UL':
    case 'OL':
      return listOf(element);

    case 'TABLE':
      return tableOf(element);

    case 'BLOCKQUOTE':
      return prefix(blocksOf(element).join('\n\n'), '> ');

    case 'P':
    case 'DT':
      return guardStart(inlineOf(element.childNodes).trim());

    case 'DD':
      return prefix(blocksOf(element).join('\n\n'), '  ').trimStart();

    default:
      return blocksOf(element).join('\n\n');
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
  if (typeof DOMParser === 'undefined' || !html.trim()) {
    return '';
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');

  return blocksOf(parsed.body)
    .join('\n\n')
    .replace(/[ \t]+$/gm, (spaces) => (spaces.length >= 2 ? '  ' : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
