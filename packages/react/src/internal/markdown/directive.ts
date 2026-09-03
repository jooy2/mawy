/**
 * The head of a directive: its name, its label and its attributes.
 *
 * All three forms — `:::container`, `::leaf` and `:text` — are written the same
 * way after the colons, so they are read the same way here and the three
 * callers differ only in what they do with what comes back. Which is also what
 * keeps them from drifting: there is one answer to "is `{kind=warning}` well
 * formed", not three.
 *
 * Nothing in here knows what a directive means. It reads a shape and hands it
 * over; see `MdContainerDirective` for why that is the whole point.
 */

const NAME_START = /[A-Za-z]/;
const NAME_REST = /[A-Za-z0-9_-]/;
const KEY_START = /[A-Za-z_]/;
const KEY_REST = /[A-Za-z0-9_.:-]/;
/** Where a value with no quotes around it stops. */
const BARE_END = /[\s"'`=<>{}]/;
const SEPARATOR = /[ \t]/;

export interface DirectiveHead {
  name: string;
  /**
   * Where the `[label]`'s content sits, not counting the brackets. `null` when
   * the document wrote none, which is not the same as an empty one: `:a[]` said
   * a label and meant nothing to be in it.
   */
  label: { start: number; end: number } | null;
  /** `{key=value}`, in the order they were written. Empty when there was none. */
  attributes: Record<string, string>;
  /** Just past the last character of the head. */
  end: number;
}

/**
 * The `[label]` at `at`, if there is a closed one.
 *
 * Brackets nest and a backslash escapes one, so `[a [b] c]` is one label and
 * `[a \] b]` is another. An unclosed `[` is not a label at all and is left
 * where it is — for a block directive that leaves trailing text on the line,
 * which means the line was never a directive; for a text one it means the
 * bracket is a bracket.
 */
function readLabel(source: string, at: number): { start: number; end: number } | null {
  if (source[at] !== '[') {
    return null;
  }

  let depth = 0;
  let index = at;

  while (index < source.length) {
    const character = source[index];

    if (character === '\\') {
      index += 2;
      continue;
    }

    if (character === '\n') {
      return null;
    }

    if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;

      if (depth === 0) {
        return { start: at + 1, end: index };
      }
    }

    index += 1;
  }

  return null;
}

/** A value, quoted or not. `null` when there is nothing readable at `at`. */
function readValue(source: string, at: number): { value: string; end: number } | null {
  const quote = source[at];

  if (quote === '"' || quote === "'") {
    let value = '';
    let index = at + 1;

    while (index < source.length) {
      const character = source[index];

      if (character === '\\') {
        // A backslash takes the next character literally, which is the only way
        // to write the quote that is holding the value open.
        if (source[index + 1] === undefined || source[index + 1] === '\n') {
          return null;
        }

        value += source[index + 1];
        index += 2;
        continue;
      }

      if (character === '\n') {
        return null;
      }

      if (character === quote) {
        return { value, end: index + 1 };
      }

      value += character;
      index += 1;
    }

    return null;
  }

  let index = at;

  while (index < source.length && !BARE_END.test(source[index])) {
    index += 1;
  }

  return index === at ? null : { value: source.slice(at, index), end: index };
}

/**
 * The `{…}` at `at`.
 *
 * `null` for anything that is not a well-formed set of attributes, and the
 * caller treats that as "not a directive" rather than as "a directive with no
 * attributes" — `::a{` is a line somebody wrote, not a video with a brace after
 * it.
 */
function readAttributes(
  source: string,
  at: number
): { attributes: Record<string, string>; end: number } | null {
  if (source[at] !== '{') {
    return null;
  }

  // No prototype, because every key here comes out of the document. A key is
  // `[A-Za-z_][A-Za-z0-9_.:-]*`, which `constructor` and `toString` both are,
  // and an ordinary object answers for those with something the author never
  // wrote — handed on to whatever the application does with `attributes`.
  const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
  let index = at + 1;

  const put = (key: string, value: string) => {
    // Classes are the one thing that accumulates: `.a .b` is two of them, the
    // way it is everywhere else this syntax is written. Everything else is the
    // last one written, keeping the place the first one had.
    attributes[key] = key === 'class' && attributes.class ? `${attributes.class} ${value}` : value;
  };

  while (index < source.length) {
    while (SEPARATOR.test(source[index] ?? '')) {
      index += 1;
    }

    if (source[index] === '}') {
      return { attributes, end: index + 1 };
    }

    const shorthand = source[index] === '#' ? 'id' : source[index] === '.' ? 'class' : null;

    if (shorthand) {
      const value = readValue(source, index + 1);

      if (!value) {
        return null;
      }

      put(shorthand, value.value);
      index = value.end;
      continue;
    }

    if (!KEY_START.test(source[index] ?? '')) {
      return null;
    }

    let end = index + 1;

    while (end < source.length && KEY_REST.test(source[end])) {
      end += 1;
    }

    const key = source.slice(index, end);

    if (source[end] !== '=') {
      // A name on its own is a name with nothing after it, which is what
      // `{open}` says and what an application reads as a flag.
      put(key, '');
      index = end;
      continue;
    }

    const value = readValue(source, end + 1);

    if (!value) {
      return null;
    }

    put(key, value.value);
    index = value.end;
  }

  return null;
}

/**
 * A directive's head, starting at the first character of its name.
 *
 * `at` is just past the colons; `null` means there is no name there, which is
 * every `:` in every sentence that was only ever a colon.
 */
export function readDirectiveHead(source: string, at: number): DirectiveHead | null {
  if (!NAME_START.test(source[at] ?? '')) {
    return null;
  }

  let end = at + 1;

  while (end < source.length && NAME_REST.test(source[end])) {
    end += 1;
  }

  const name = source.slice(at, end);
  const label = readLabel(source, end);

  if (label) {
    end = label.end + 1;
  }

  const attributes = readAttributes(source, end);

  if (attributes) {
    end = attributes.end;
  }

  return { name, label, attributes: attributes?.attributes ?? {}, end };
}
