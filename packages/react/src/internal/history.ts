/**
 * Undo, over the document rather than over a surface.
 *
 * The source surface has the browser's own undo stack and it is a good one —
 * but it belongs to a `<textarea>`, and the drawn document is a
 * `contenteditable` that refuses every input, which is a way of saying it never
 * gets one. Two stacks would be worse than one either way: switching surface
 * mid-edit would step back through half of what happened and then stop.
 *
 * So the history is a list of documents, and both surfaces put their changes on
 * it. What is stored is the document *before* each change, along with where the
 * caret was, because that is the state undo has to arrive at.
 *
 * A run of typing is one step rather than one per keystroke, which is the whole
 * craft of this: `Cmd`+`Z` that gives back one character at a time is one that
 * nobody uses twice. A change carries on from the one before it while it is the
 * same kind of change, in the same place, within a moment of it — and a
 * composed syllable counts as typing, because a Korean keyboard replaces what
 * it wrote on every jamo and none of those are separate thoughts.
 */

/** A document and a caret: everything undo has to put back. */
export interface MawyStep {
  value: string;
  start: number;
  end: number;
}

/** How a change was made, for deciding whether the next one carries on from it. */
type Kind = 'none' | 'insert' | 'delete' | 'replace';

export interface MawyHistory {
  past: MawyStep[];
  future: MawyStep[];
  kind: Kind;
  /** Where the last change left off, which is where the next one continues. */
  edge: number;
  /** When it happened. */
  at: number;
}

/** How long a run of typing stays one run without a keystroke. */
const RUN = 700;

/**
 * How many documents to keep.
 *
 * Each step is the whole document, which is the simple thing to store and the
 * expensive one: a five-hundred-step history of a hundred-kilobyte file is
 * fifty megabytes. Far enough back to be an undo history, near enough not to be
 * a memory leak with a long session in it.
 */
const DEPTH = 500;

export function emptyHistory(): MawyHistory {
  return { past: [], future: [], kind: 'none', edge: 0, at: 0 };
}

/** The smallest run of characters that differs between two documents. */
export function difference(
  before: string,
  after: string
): { at: number; removed: number; inserted: string } {
  let head = 0;

  while (head < before.length && head < after.length && before[head] === after[head]) {
    head += 1;
  }

  let tail = 0;

  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1;
  }

  return {
    at: head,
    removed: before.length - head - tail,
    inserted: after.slice(head, after.length - tail)
  };
}

/** A change put on the history, joined to the one before it where it belongs. */
export function record(history: MawyHistory, before: MawyStep, after: string, now: number): void {
  if (before.value === after) {
    return;
  }

  const change = difference(before.value, after);
  const kind: Kind = change.removed === 0 ? 'insert' : change.inserted ? 'replace' : 'delete';

  // Where the last change left off is where this one has to start — or end, for
  // a change that rewrites what the last one wrote. That second case is what an
  // input method does on every keystroke while it builds a syllable, and none of
  // those are a separate thing the writer did.
  const joins = change.at === history.edge || change.at + change.removed === history.edge;

  const carriesOn =
    history.past.length > 0 &&
    now - history.at < RUN &&
    joins &&
    // A line ending is where a thought ended, and undo should stop there.
    !/[\n\r]/.test(change.inserted) &&
    (kind === 'delete'
      ? history.kind === 'delete'
      : history.kind === 'insert' || history.kind === 'replace');

  if (!carriesOn) {
    history.past.push(before);

    if (history.past.length > DEPTH) {
      history.past.shift();
    }
  }

  history.future.length = 0;
  // A line ending closes the run behind it and opens nothing: what is typed
  // after it is the next thought, and undo should stop between the two.
  history.kind = /[\n\r]/.test(change.inserted) ? 'none' : kind;
  history.edge = change.at + change.inserted.length;
  history.at = now;
}

/** One step back, with `current` kept so it can be come back to. */
export function undo(history: MawyHistory, current: MawyStep): MawyStep | null {
  const step = history.past.pop();

  if (!step) {
    return null;
  }

  history.future.push(current);
  history.kind = 'none';

  return step;
}

/** One step forward again. */
export function redo(history: MawyHistory, current: MawyStep): MawyStep | null {
  const step = history.future.pop();

  if (!step) {
    return null;
  }

  history.past.push(current);
  history.kind = 'none';

  return step;
}
