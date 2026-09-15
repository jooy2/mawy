/**
 * What the drawn document's floating bars act on, and what they write.
 *
 * A picture, a link, a code block and an alert are each drawn as what they
 * mean, and what they are written with — an address, a description, the
 * language on a fence, the kind in `[!NOTE]` — is nowhere on the page for a
 * caret to be in. Writing it out as characters when the caret arrived was how
 * it was edited, and a picture turning into `![...](...)` under a press at its
 * edge was a picture disappearing. So each is edited from a bar beside it
 * instead, and this is the arithmetic the bars run: one function per thing a
 * bar can change, each a string in and a string out, the way the commands are.
 *
 * The source surfaces show all of it as characters already, and have none of
 * these bars. Nor does the Flutter package, which has no drawn document.
 */

import { removeBlock } from './commands.js';
import type { MawyEdit } from './editing.js';
import type { MdAlertKind, MdNode, MdRange } from './markdown/ast.js';
import { toPlainText } from './markdown/inline.js';

/** Something on the drawn document one of the bars is for, where the caret is. */
export type MawyBlockTarget =
  | { kind: 'image'; range: MdRange; url: string; alt: string; title: string | null }
  | {
      kind: 'link';
      range: MdRange;
      url: string;
      title: string | null;
      /** Its words as they read. */
      text: string;
      /** Where its words are written, formatting and all; `null` for none. */
      words: MdRange | null;
    }
  | { kind: 'code'; range: MdRange; lang: string }
  | { kind: 'alert'; range: MdRange; alert: MdAlertKind };

/**
 * What the selection is inside, of the things a bar is for — the innermost, so
 * a link in an alert is the link — or `null`.
 *
 * Inside with its edges, so a caret straight after a picture or at the end of a
 * link's words has the bar for it. A fenced code block only: an indented one
 * has no fence to name a language on.
 */
export function targetAt(
  nodes: readonly MdNode[],
  start: number,
  end: number,
  value: string
): MawyBlockTarget | null {
  for (const node of nodes) {
    if (start < node.range.start || end > node.range.end) {
      continue;
    }

    const inside =
      node.type === 'code' || !('children' in node)
        ? null
        : targetAt(node.children as MdNode[], start, end, value);

    if (inside) {
      return inside;
    }

    const range = { start: node.range.start, end: node.range.end };

    if (node.type === 'image') {
      return { kind: 'image', range, url: node.url, alt: node.alt, title: node.title };
    }

    if (node.type === 'link') {
      const first = node.children[0];
      const last = node.children[node.children.length - 1];

      return {
        kind: 'link',
        range,
        url: node.url,
        title: node.title,
        text: toPlainText(node.children),
        words: first && last ? { start: first.range.start, end: last.range.end } : null
      };
    }

    if (
      node.type === 'code' &&
      /^[ \t>]*(?:`{3}|~{3})/.test(value.slice(node.range.start, node.content.start))
    ) {
      return { kind: 'code', range, lang: node.lang ?? '' };
    }

    if (node.type === 'blockquote' && node.alert) {
      return { kind: 'alert', range, alert: node.alert };
    }
  }

  return null;
}

/**
 * An address as a destination is written: in angle brackets where it has a
 * space or a parenthesis in it, which would otherwise end it, and with the
 * characters no destination can hold escaped.
 */
function destination(url: string): string {
  const clean = url.trim().replace(/[<>\n]/g, (character) => encodeURIComponent(character));

  return /[\s()]/.test(clean) ? `<${clean}>` : clean;
}

function titled(title: string | null): string {
  return title === null ? '' : ` "${title.replace(/["\\]/g, '\\$&')}"`;
}

/** Words written inside square brackets, with the brackets in them escaped. */
function bracketed(words: string): string {
  return words.replace(/[\\[\]]/g, '\\$&');
}

/** A picture written again with this address and description, and the caret after it. */
export function imageWritten(
  value: string,
  target: Extract<MawyBlockTarget, { kind: 'image' }>,
  next: { url: string; alt: string }
): MawyEdit {
  const text = `![${bracketed(next.alt)}](${destination(next.url)}${titled(target.title)})`;

  return {
    value: value.slice(0, target.range.start) + text + value.slice(target.range.end),
    caret: target.range.start + text.length
  };
}

/**
 * A link written again with this address and these words, and the caret at the
 * end of its words.
 *
 * Words left as they were keep the formatting they were written with; words
 * changed are written plain, since what the bar was given is plain.
 */
export function linkWritten(
  value: string,
  target: Extract<MawyBlockTarget, { kind: 'link' }>,
  next: { url: string; text: string }
): MawyEdit {
  const words =
    next.text === target.text && target.words
      ? value.slice(target.words.start, target.words.end)
      : bracketed(next.text || next.url);
  const text = `[${words}](${destination(next.url)}${titled(target.title)})`;

  return {
    value: value.slice(0, target.range.start) + text + value.slice(target.range.end),
    caret: target.range.start + 1 + words.length
  };
}

/** A link taken off its words, which stay as they were written. */
export function linkRemoved(
  value: string,
  target: Extract<MawyBlockTarget, { kind: 'link' }>
): MawyEdit {
  const words = target.words ? value.slice(target.words.start, target.words.end) : '';

  return {
    value: value.slice(0, target.range.start) + words + value.slice(target.range.end),
    caret: target.range.start + words.length
  };
}

/** A link or a picture taken out, words and all. */
export function inlineRemoved(value: string, range: MdRange): MawyEdit {
  return { value: value.slice(0, range.start) + value.slice(range.end), caret: range.start };
}

/** A new link or picture written in place of a selection, and the caret after it. */
export function inserted(
  value: string,
  range: MdRange,
  next: { url: string; text: string; image: boolean }
): MawyEdit {
  const text = next.image
    ? `![${bracketed(next.text)}](${destination(next.url)})`
    : `[${bracketed(next.text || next.url)}](${destination(next.url)})`;

  return {
    value: value.slice(0, range.start) + text + value.slice(range.end),
    caret: range.start + text.length
  };
}

/** A caret moved by an edit at one place in front of it. */
function shifted(caret: number, at: number, grown: number): number {
  return caret > at ? Math.max(at, caret + grown) : caret;
}

/**
 * A code block's fence given this language, or none. What followed the
 * language on the fence goes with it where there is no language left for it
 * to follow. `null` where the block has no fence.
 */
export function codeLanguageWritten(
  value: string,
  range: MdRange,
  lang: string,
  caret: number
): MawyEdit | null {
  const stop = value.indexOf('\n', range.start);
  const line = value.slice(range.start, stop === -1 ? value.length : stop);
  const fence = /^([ \t>]*(?:`{3,}|~{3,}))[ \t]*(\S*)(.*)$/.exec(line);

  if (!fence) {
    return null;
  }

  const name = lang.replace(/[\s`]/g, '');
  const written = `${fence[1]}${name}${name ? fence[3] : ''}`;
  const grown = written.length - line.length;

  return {
    value: value.slice(0, range.start) + written + value.slice(range.start + line.length),
    caret: shifted(caret, range.start + fence[1].length, grown)
  };
}

/** An alert made another kind. `null` where the block says no kind on its first line. */
export function alertWritten(
  value: string,
  range: MdRange,
  alert: MdAlertKind,
  caret: number
): MawyEdit | null {
  const stop = value.indexOf('\n', range.start);
  const line = value.slice(range.start, stop === -1 ? value.length : stop);
  const kind = /\[!(?:note|tip|important|warning|caution)\]/i.exec(line);

  if (!kind) {
    return null;
  }

  const at = range.start + kind.index;
  const written = `[!${alert.toUpperCase()}]`;

  return {
    value: value.slice(0, at) + written + value.slice(at + kind[0].length),
    caret: shifted(caret, at, written.length - kind[0].length)
  };
}

/** A block taken out whole. See `removeBlock`. */
export function blockRemoved(value: string, range: MdRange): MawyEdit {
  const after = removeBlock(value, range.start, range.end);

  return { value: after.value, caret: after.start };
}
