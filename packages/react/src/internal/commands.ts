/**
 * What a formatting command does to a document.
 *
 * Pure functions over `{ value, start, end }` and nothing else: no element, no
 * event, no React. That is what makes them testable at all — the alternative is
 * a test that has to mount an editor to find out what Cmd+B does to a list
 * item — and it is also what will let the WYSIWYG surface reuse them.
 *
 * Every command is a *toggle*. Pressing Cmd+B on bold text unbolds it, which
 * sounds obvious and is the half people leave out.
 */

export interface EditState {
  value: string;
  start: number;
  end: number;
}

export type MawyCommand =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule';

/* -------------------------------------------------------------------------
 * Lines
 * ---------------------------------------------------------------------- */

/** The offsets of the first and last line the selection touches. */
function lineRange(value: string, start: number, end: number): [number, number] {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const to = value.indexOf('\n', end);

  return [from, to === -1 ? value.length : to];
}

/**
 * Every line the selection touches, rewritten.
 *
 * The selection is put back around the whole of the rewritten block rather than
 * being tracked character by character. A command that changes the marker on
 * four lines has no honest answer for "where was the caret" anyway, and leaving
 * the block selected is what lets the next command act on the same lines.
 */
function mapLines(state: EditState, rewrite: (lines: string[]) => string[]): EditState {
  const [from, to] = lineRange(state.value, state.start, state.end);
  const block = rewrite(state.value.slice(from, to).split('\n')).join('\n');

  return {
    value: state.value.slice(0, from) + block + state.value.slice(to),
    start: from,
    end: from + block.length
  };
}

/** The indentation a line opens with, so a marker goes after it and not before. */
function indentOf(line: string): string {
  return /^[ \t]*/.exec(line)?.[0] ?? '';
}

const MARKERS: Record<string, RegExp> = {
  quote: /^[ \t]*> ?/,
  bulletList: /^[ \t]*[-*+] (?!\[[ xX]\] )/,
  taskList: /^[ \t]*[-*+] \[[ xX]\] /,
  orderedList: /^[ \t]*\d{1,9}[.)] /,
  heading: /^[ \t]*#{1,6} /
};

/** Every marker off the front of a line, so one command can replace another. */
function bare(line: string): string {
  let out = line;

  for (const pattern of Object.values(MARKERS)) {
    out = out.replace(pattern, indentOf(out));
  }

  return out;
}

function togglePrefix(state: EditState, kind: keyof typeof MARKERS, prefix: string): EditState {
  return mapLines(state, (lines) => {
    const content = lines.filter((line) => line.trim());
    const on = content.length > 0 && content.every((line) => MARKERS[kind].test(line));

    return lines.map((line) =>
      on ? bare(line) : indentOf(line) + prefix + bare(line).trimStart()
    );
  });
}

function toggleOrdered(state: EditState): EditState {
  return mapLines(state, (lines) => {
    const content = lines.filter((line) => line.trim());
    const on = content.length > 0 && content.every((line) => MARKERS.orderedList.test(line));
    let number = 0;

    return lines.map((line) => {
      if (on) {
        return bare(line);
      }

      // Blank lines inside the block keep their place and do not take a number.
      if (!line.trim()) {
        return line;
      }

      number += 1;

      return `${indentOf(line)}${number}. ${bare(line).trimStart()}`;
    });
  });
}

function toggleHeading(state: EditState, depth: number): EditState {
  const hashes = '#'.repeat(depth);

  return mapLines(state, (lines) => {
    const on = lines.every((line) => new RegExp(`^[ \\t]*${hashes} `).test(line));

    return lines.map((line) =>
      on || depth === 0 ? bare(line) : `${indentOf(line)}${hashes} ${bare(line).trimStart()}`
    );
  });
}

/* -------------------------------------------------------------------------
 * Wrapping
 * ---------------------------------------------------------------------- */

/**
 * A marker put around the selection, or taken back off it.
 *
 * Both sides of "already wrapped" are checked: the markers may be inside the
 * selection, because the reader selected them, or outside it, because they
 * double-clicked the word between them. Only the second is ever thought of.
 */
function toggleWrap(state: EditState, marker: string): EditState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);
  const width = marker.length;

  if (selected.length >= width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(width, -width);

    return {
      value: value.slice(0, start) + inner + value.slice(end),
      start,
      end: start + inner.length
    };
  }

  if (value.slice(start - width, start) === marker && value.slice(end, end + width) === marker) {
    return {
      value: value.slice(0, start - width) + selected + value.slice(end + width),
      start: start - width,
      end: end - width
    };
  }

  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    // An empty selection leaves the caret between the two markers, ready to
    // type; a real one stays around the words it was around.
    start: start + width,
    end: end + width
  };
}

/**
 * A link, or an image, which is a link written with a `!` in front of it.
 *
 * The same command twice over rather than two of them, because the only
 * difference between what they write is that one character — and the halves
 * mean the same things: a URL selected becomes the destination, and anything
 * else becomes the words, or the description a reader who cannot see the
 * image is given.
 */
function insertLink(state: EditState, image: boolean): EditState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);
  const isUrl = /^(?:https?:\/\/|mailto:|\/|\.\/|#)\S*$/.test(selected.trim());

  const mark = image ? '!' : '';
  const label = isUrl ? '' : selected;
  const url = isUrl ? selected.trim() : 'url';
  const text = `${mark}[${label}](${url})`;
  // Whichever half is the placeholder is what comes out selected, so the next
  // thing typed replaces it.
  const at = start + mark.length + (isUrl ? 1 : label.length + 3);

  return {
    value: value.slice(0, start) + text + value.slice(end),
    start: at,
    end: isUrl ? at : at + url.length
  };
}

function toggleCodeBlock(state: EditState): EditState {
  const [from, to] = lineRange(state.value, state.start, state.end);
  const block = state.value.slice(from, to);
  const lines = block.split('\n');
  const fenced =
    lines.length > 1 && /^ {0,3}```/.test(lines[0]) && /^ {0,3}```/.test(lines[lines.length - 1]);
  const inner = fenced ? lines.slice(1, -1).join('\n') : `\`\`\`\n${block}\n\`\`\``;

  return {
    value: state.value.slice(0, from) + inner + state.value.slice(to),
    start: from,
    end: from + inner.length
  };
}

function insertRule(state: EditState): EditState {
  const { value, start, end } = state;
  const before = start > 0 && value[start - 1] !== '\n' ? '\n\n' : '';
  const after = end < value.length && value[end] !== '\n' ? '\n\n' : '\n';
  const text = `${before}---${after}`;

  return {
    value: value.slice(0, start) + text + value.slice(end),
    start: start + text.length,
    end: start + text.length
  };
}

/* -------------------------------------------------------------------------
 * The table of them
 * ---------------------------------------------------------------------- */

export function runCommand(command: MawyCommand, state: EditState): EditState {
  switch (command) {
    case 'bold':
      return toggleWrap(state, '**');
    case 'italic':
      return toggleWrap(state, '_');
    case 'strikethrough':
      return toggleWrap(state, '~~');
    case 'code':
      return toggleWrap(state, '`');
    case 'link':
      return insertLink(state, false);
    case 'image':
      return insertLink(state, true);
    case 'heading1':
      return toggleHeading(state, 1);
    case 'heading2':
      return toggleHeading(state, 2);
    case 'heading3':
      return toggleHeading(state, 3);
    case 'paragraph':
      return toggleHeading(state, 0);
    case 'quote':
      return togglePrefix(state, 'quote', '> ');
    case 'bulletList':
      return togglePrefix(state, 'bulletList', '- ');
    case 'taskList':
      return togglePrefix(state, 'taskList', '- [ ] ');
    case 'orderedList':
      return toggleOrdered(state);
    case 'codeBlock':
      return toggleCodeBlock(state);
    case 'rule':
      return insertRule(state);
    default:
      return state;
  }
}

/**
 * Whether the selection is already what the command would make it.
 *
 * This is what lets a toolbar button be drawn as pressed, and it matters more
 * than it looks: a toggle that never shows its state is a button you have to
 * press to find out what it does.
 */
export function commandActive(command: MawyCommand, state: EditState): boolean {
  const wrapped = (marker: string): boolean => {
    const selected = state.value.slice(state.start, state.end);
    const width = marker.length;

    return (
      (selected.length >= width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) ||
      (state.value.slice(state.start - width, state.start) === marker &&
        state.value.slice(state.end, state.end + width) === marker)
    );
  };

  const everyLine = (pattern: RegExp): boolean => {
    const [from, to] = lineRange(state.value, state.start, state.end);
    const lines = state.value
      .slice(from, to)
      .split('\n')
      .filter((line) => line.trim());

    return lines.length > 0 && lines.every((line) => pattern.test(line));
  };

  switch (command) {
    case 'bold':
      return wrapped('**');
    case 'italic':
      return wrapped('_');
    case 'strikethrough':
      return wrapped('~~');
    case 'code':
      return wrapped('`');
    case 'heading1':
      return everyLine(/^[ \t]*# /);
    case 'heading2':
      return everyLine(/^[ \t]*## /);
    case 'heading3':
      return everyLine(/^[ \t]*### /);
    case 'quote':
      return everyLine(MARKERS.quote);
    case 'bulletList':
      return everyLine(MARKERS.bulletList);
    case 'orderedList':
      return everyLine(MARKERS.orderedList);
    case 'taskList':
      return everyLine(MARKERS.taskList);
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------
 * Enter, inside a list
 * ---------------------------------------------------------------------- */

/**
 * A line that carries a marker down when `Enter` is pressed on it.
 *
 * The `:` is a definition's, and it is on this list rather than beside it
 * because it behaves identically: the next line takes the same marker, and an
 * item still empty gives it up. `:` needs the space after it to be one at all,
 * which is what keeps `:warning:` from being a definition of the line above.
 */
const ITEM = /^([ \t]*)([-*+]|:|(\d{1,9})[.)])([ \t]+)(\[[ xX]\][ \t]+)?(.*)$/;

/**
 * What Enter should do, when the line it was pressed on is a list item.
 *
 * Two behaviours, and the second is the one that makes the first bearable:
 * a new item carries the marker down, and pressing Enter on an item that is
 * still empty takes the marker away instead of making another empty one. Without
 * that, leaving a list means deleting the bullet the editor just helpfully
 * added.
 *
 * `null` when the line is not a list item at all, and Enter is just Enter.
 */
export function continueList(state: EditState): EditState | null {
  if (state.start !== state.end) {
    return null;
  }

  const from = state.value.lastIndexOf('\n', state.start - 1) + 1;
  const line = state.value.slice(from, state.start);
  const item = ITEM.exec(line);

  if (!item) {
    return null;
  }

  const [, indent, marker, ordinal, space, task, content] = item;

  if (!content.trim()) {
    // An empty item: the marker goes, and so does the list.
    return {
      value: state.value.slice(0, from) + state.value.slice(state.start),
      start: from,
      end: from
    };
  }

  const next = ordinal
    ? `${indent}${Number.parseInt(ordinal, 10) + 1}${marker.slice(ordinal.length)}${space}`
    : `${indent}${marker}${space}`;
  // A checked box does not carry its tick down to the next line.
  const text = `\n${next}${task ? '[ ] ' : ''}`;

  return {
    value: state.value.slice(0, state.start) + text + state.value.slice(state.start),
    start: state.start + text.length,
    end: state.start + text.length
  };
}
