/**
 * Keeping the two panes of `split` on the same part of the document.
 *
 * Scrolling one pane by the same fraction as the other is the obvious answer
 * and it is wrong in a way that is easy to feel: a fenced code block is twenty
 * lines of source and twenty lines of page, a paragraph of prose is one long
 * line of source and six of page, and an image is a line of source and half a
 * screen of page. The fraction through the file is not the fraction down the
 * page, and the further apart those two get the further the preview is from
 * whatever is being typed.
 *
 * So the panes are lined up at the places they can agree on instead. Every
 * element the renderer draws for a block says which characters of the source it
 * came from, and every line of the source is a row in the layer under the
 * textarea — pair those up and there is a list of positions that mean the same
 * thing in both panes, with a straight line between each pair and the next.
 */

/** A place both panes agree on, in each one's own pixels. */
export interface MawyScrollAnchor {
  /** Where it is in the source pane. */
  from: number;
  /** Where it is in the preview. */
  to: number;
}

/** Where each line of a document begins. */
export function lineStarts(text: string): number[] {
  const starts = [0];

  for (let at = text.indexOf('\n'); at !== -1; at = text.indexOf('\n', at + 1)) {
    starts.push(at + 1);
  }

  return starts;
}

/** Which of those lines an offset is on. */
export function lineAt(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  let found = 0;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (starts[middle] <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/**
 * Where an element sits inside the box that scrolls it.
 *
 * The number `scrollTop` would have to be for the element to be at the top of
 * what can be seen — which is what makes the two panes comparable, since each
 * is measured against its own scroller rather than against the window.
 */
function offsetWithin(element: Element, scroller: Element): number {
  return (
    element.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top -
    scroller.clientTop +
    scroller.scrollTop
  );
}

/**
 * The two panes read, and the places they agree on paired up.
 *
 * Anchors that do not move both panes forward are dropped rather than kept and
 * sorted: a block and the first block inside it start on the same line, and a
 * pair that goes backwards would make the preview jump back up in the middle of
 * a smooth scroll.
 */
export function measureAnchors(
  input: HTMLTextAreaElement,
  preview: HTMLElement,
  text: string
): MawyScrollAnchor[] {
  const rows = input.parentElement?.querySelectorAll<HTMLElement>('.mawy-source-line');
  const blocks = preview.querySelectorAll<HTMLElement>('[data-mawy-range]');

  if (!rows?.length || !blocks.length) {
    return [];
  }

  const starts = lineStarts(text);
  const anchors: MawyScrollAnchor[] = [{ from: 0, to: 0 }];

  for (const element of blocks) {
    const start = Number.parseInt(element.dataset.mawyRange ?? '', 10);
    const row = Number.isFinite(start) ? rows[lineAt(starts, start)] : undefined;

    if (!row) {
      continue;
    }

    const from = offsetWithin(row, input);
    const to = offsetWithin(element, preview);
    const last = anchors[anchors.length - 1];

    if (from > last.from && to > last.to) {
      anchors.push({ from, to });
    }
  }

  const last = anchors[anchors.length - 1];

  // The ends, so a document scrolled all the way down in one pane is all the
  // way down in the other rather than wherever the last block left it.
  anchors.push({
    from: Math.max(input.scrollHeight, last.from + 1),
    to: Math.max(preview.scrollHeight, last.to + 1)
  });

  return anchors;
}

/** Where the preview belongs, for a source scrolled to `at`. */
export function previewScrollFor(anchors: MawyScrollAnchor[], at: number): number {
  let low = 0;
  let high = anchors.length - 1;
  let found = 0;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (anchors[middle].from <= at) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const start = anchors[found];
  const next = anchors[found + 1];

  if (!next) {
    return start.to;
  }

  const span = next.from - start.from;

  return span > 0 ? start.to + ((at - start.from) / span) * (next.to - start.to) : start.to;
}
