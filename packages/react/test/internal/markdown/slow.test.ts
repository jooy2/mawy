import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';
import slow from '../../../../flutter/tool/slow.json';

/**
 * How long a document takes against how long it is, on the list the Flutter
 * package is held to.
 *
 * A parser that gets slower with the square of its input passes every test that
 * gives it a sentence, and then freezes the page when it is handed a file
 * somebody else wrote. A search for a line ending that was not there took two
 * thirds of the time of parsing every document anybody has, and 128 kilobytes of
 * `[` took three seconds, and nothing here said so.
 *
 * Time is the thing a test should not read, so what is read is a ratio on the
 * one machine: the same document eight times as long takes about eight times as
 * long whatever the machine is, and sixty-four times if it is quadratic. Keeping
 * the two a long way apart is what keeps this from failing on a busy runner.
 *
 * `packages/flutter/tool/slow.json` holds the shapes, deliberately beside
 * `corpus.json`: both suites read the one file, so a shape added for one is a
 * shape the other answers too. A part is some text and how many times to write
 * it, `{n}` in the text being which time this is, and a part marked `rising`
 * writes a run of the text one longer each time.
 */

/** How many times longer the long document is. */
const SCALE = 8;

/**
 * What a document that really grows with its length stays under. A little past
 * twice the honest ratio, because a collector runs on the long one.
 */
const ALLOWED = 20;

/** Below this a clock is measuring itself, so a short document counts as this. */
const FLOOR = 4;

type Part = [text: string, times: number, rising?: string];

/** The document, at this many times its length in the list. */
function written(parts: Part[], scale: number): string {
  let out = '';

  for (const [text, times, rising] of parts) {
    if (rising) {
      const longest = times * Math.round(Math.sqrt(scale));

      for (let length = 1; length <= longest; length += 1) {
        out += `${text.repeat(length)} `;
      }

      continue;
    }

    if (!text.includes('{n}')) {
      out += text.repeat(times === 1 ? 1 : times * scale);
      continue;
    }

    for (let index = 0; index < times * scale; index += 1) {
      out += text.replace('{n}', String(index));
    }
  }

  return out;
}

/** The fastest of a few runs, because everything that can happen makes one slower. */
function best(source: string, runs: number): number {
  let least = Infinity;

  for (let run = 0; run < runs; run += 1) {
    const started = performance.now();

    parseMarkdown(source);
    least = Math.min(least, performance.now() - started);
  }

  return least;
}

describe('a document costs what it is long', () => {
  it.each(slow as { why: string; parts: Part[] }[])('$why', { retry: 2 }, ({ parts }) => {
    const short = written(parts, 1);
    const long = written(parts, SCALE);

    // Once for the compiler, which has not seen this shape.
    best(short, 1);

    const shortest = Math.max(best(short, 3), FLOOR);
    const longest = best(long, 3);

    expect(longest / shortest).toBeLessThan(ALLOWED);
  });
});
