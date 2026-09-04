/**
 * How much of the source pane is drawn as coloured lines, and how the rest of
 * it is still found.
 *
 * The pane is a `<textarea>` with a copy of the same text laid exactly
 * underneath it, and the copy used to be one row per line: a five-thousand-line
 * file was five thousand rows built to show forty. What makes that hard to fix
 * is that the two layers have to agree about where every line sits, and a
 * window that leaves lines out has to know the height of what it left — which a
 * wrapped line does not answer without being laid out.
 *
 * So nothing is left out. The copy is cut into chunks of a fixed number of
 * lines, every chunk holds its own text either way, and what changes is only
 * *how* it holds it: a chunk near the view is a row per line with the syntax
 * coloured in, and a chunk away from it is the same characters as one run of
 * text. A run of `n` lines is `n` line boxes whichever way it is written, so the
 * chunk is the same height in both and no arithmetic decides where anything
 * goes.
 *
 * Three things fall out of that, and each of them is why it was done this way
 * rather than by leaving the far lines out:
 *
 * - The browser's own find still finds the whole document.
 * - Printing still puts the whole document on the paper.
 * - A chunk that has not been coloured yet is plain text in the right place
 *   rather than a hole, so a scroll that outruns the observer costs colour for
 *   a frame and never costs the page.
 */

/**
 * How many lines a chunk holds.
 *
 * Small enough that colouring one is cheap, large enough that a long document
 * is not thousands of boxes to observe. Forty is about a screen.
 */
export const SOURCE_CHUNK = 40;

/**
 * How long a document has to be before any of this is worth doing.
 *
 * Under it every line is drawn the way it always was, which keeps the common
 * document — a page of notes, a README — on exactly the code it had, and keeps
 * the first frame coloured rather than waiting a frame for an observer.
 */
export const SOURCE_WINDOW_FROM = 600;

/** Which chunk a line is in. */
export function chunkOf(line: number): number {
  return Math.floor(line / SOURCE_CHUNK);
}

/** How many chunks a document of `lines` lines is cut into. */
export function chunkCount(lines: number): number {
  return Math.max(1, Math.ceil(lines / SOURCE_CHUNK));
}

/**
 * How tall one row of the source is, which is its line height.
 *
 * Read from the layer rather than from a number written here, because the
 * stylesheet owns it and an application restyling the pane moves it. Read once
 * by whoever is about to ask about a run of lines; see [rowRect].
 */
export function rowHeight(lines: Element): number {
  const height = Number.parseFloat(getComputedStyle(lines).lineHeight);

  return Number.isFinite(height) && height > 0 ? height : 0;
}

/**
 * Where a line of the source is drawn, in the page's own coordinates.
 *
 * A coloured line is an element and answers for itself. A line inside a chunk
 * that is drawn as one run of text is not, so it is asked for as a range over
 * the characters it is written with — which is the same question the browser
 * answers when it draws a selection, and is exact for a wrapped line as well.
 *
 * The two are not the same box, though, and the difference is the whole reason
 * `lineHeight` is asked for. An element's box is the row: line height tall,
 * with the text sitting in the middle of it. A range's box is the *text*:
 * shorter by the leading, and so lower down by half of it. Left alone, a line
 * out of a coloured chunk and a line out of a plain one would be a few pixels
 * apart for no reason the caller could see, which for the two panes of `split`
 * is a pair of anchors that disagree about the same line. So the range's box is
 * grown back into the row it sits in, and every line answers in the same units.
 *
 * `null` for a line with nothing to measure: an empty one, or one in a chunk
 * that is not on the tree this frame.
 */
export function rowRect(lines: Element, line: number, lineHeight: number): DOMRect | null {
  const chunk = lines.children[chunkOf(line)];

  if (!chunk) {
    return null;
  }

  const nth = line - chunkOf(line) * SOURCE_CHUNK;
  const cold = chunk.firstElementChild;

  if (!cold || !cold.classList.contains('mawy-source-cold')) {
    const rows = chunk.querySelectorAll<HTMLElement>('.mawy-source-line');

    return rows[nth]?.getBoundingClientRect() ?? null;
  }

  const text = cold.firstChild;

  if (!text || text.nodeType !== 3) {
    return null;
  }

  const data = (text as Text).data;
  let start = 0;

  for (let each = 0; each < nth; each += 1) {
    const newline = data.indexOf('\n', start);

    if (newline === -1) {
      return null;
    }

    start = newline + 1;
  }

  const newline = data.indexOf('\n', start);
  const end = newline === -1 ? data.length : newline;

  if (end === start) {
    // An empty line has no characters to draw and so no box to report. Nothing
    // is lined up against a blank line anyway.
    return null;
  }

  const range = lines.ownerDocument.createRange();

  range.setStart(text, start);
  range.setEnd(text, end);

  // The first of them: a line that wrapped is several boxes, and where the line
  // *begins* is the top of the first.
  const rects = range.getClientRects();

  range.detach();

  if (!rects.length) {
    return null;
  }

  const box = rects[0];
  const leading = (lineHeight - box.height) / 2;

  return new DOMRect(box.x, box.top - leading, box.width, lineHeight);
}
