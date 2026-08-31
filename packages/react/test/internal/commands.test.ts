import { describe, expect, it } from 'vitest';
import {
  commandActive,
  continueList,
  runCommand,
  type EditState,
  type MawyCommand
} from '../../src/internal/commands.js';

/**
 * The commands, as arithmetic on a string.
 *
 * They are pure functions of `{ value, start, end }` precisely so that this
 * file does not have to mount an editor to find out what Cmd+B does to a list
 * item.
 */

/**
 * `'a|b'` is the caret there; `'a«bc»d'` is that selection.
 *
 * Guillemets rather than square brackets, because half of what a Markdown
 * command is run on — a link, a task box, a reference — is made of square
 * brackets, and a notation that collides with its own subject matter reads
 * every one of those cases wrong.
 */
function at(marked: string): EditState {
  if (marked.includes('|')) {
    const start = marked.indexOf('|');

    return { value: marked.replace('|', ''), start, end: start };
  }

  const start = marked.indexOf('«');
  const end = marked.indexOf('»') - 1;

  return { value: marked.replace('«', '').replace('»', ''), start, end };
}

/** The result, written back in the same notation. */
function show(state: EditState): string {
  const { value, start, end } = state;

  return start === end
    ? `${value.slice(0, start)}|${value.slice(start)}`
    : `${value.slice(0, start)}«${value.slice(start, end)}»${value.slice(end)}`;
}

const run = (command: MawyCommand, marked: string): string => show(runCommand(command, at(marked)));

describe('wrapping', () => {
  it('wraps a selection, and leaves it around the same words', () => {
    expect(run('bold', 'one «two» three')).toBe('one **«two»** three');
    expect(run('italic', 'one «two» three')).toBe('one _«two»_ three');
    expect(run('strikethrough', 'one «two» three')).toBe('one ~~«two»~~ three');
    expect(run('code', 'one «two» three')).toBe('one `«two»` three');
  });

  it('leaves the caret between the markers when nothing is selected', () => {
    expect(run('bold', 'one | three')).toBe('one **|** three');
  });

  it('unwraps when the markers are inside the selection', () => {
    expect(run('bold', 'one «**two**» three')).toBe('one «two» three');
  });

  it('unwraps when the markers are outside it, which is what a double-click gives', () => {
    expect(run('bold', 'one **«two»** three')).toBe('one «two» three');
  });

  it('round-trips, so a second press undoes the first', () => {
    const once = runCommand('bold', at('one «two» three'));

    expect(show(runCommand('bold', once))).toBe('one «two» three');
  });
});

describe('links', () => {
  it('puts the selection in the label and offers the destination to type over', () => {
    expect(run('link', 'see «the docs» here')).toBe('see [the docs](«url») here');
  });

  it('recognises a selected URL as the destination rather than the label', () => {
    expect(run('link', 'see «https://a.example» here')).toBe('see [|](https://a.example) here');
  });

  it('writes an image as the same thing with a `!` in front of it', () => {
    // The halves mean the same things: a URL selected is where it lives, and
    // anything else is what a reader who is not seeing it is told instead.
    expect(run('image', 'see «a cat» here')).toBe('see ![a cat](«url») here');
    expect(run('image', 'see «https://a.example/c.png» here')).toBe(
      'see ![|](https://a.example/c.png) here'
    );
    expect(run('image', 'here |')).toBe('here ![](«url»)');
  });
});

describe('line markers', () => {
  it('toggles a quotation over every line the selection touches', () => {
    expect(run('quote', 'a«\nb\nc»')).toBe('«> a\n> b\n> c»');
    expect(run('quote', '«> a\n> b»')).toBe('«a\nb»');
  });

  it('numbers an ordered list, and renumbers it', () => {
    expect(run('orderedList', 'a«\nb\nc»')).toBe('«1. a\n2. b\n3. c»');
  });

  it('replaces one marker with another rather than stacking them', () => {
    expect(run('bulletList', '«1. a\n2. b»')).toBe('«- a\n- b»');
    expect(run('taskList', '«- a»')).toBe('«- [ ] a»');
    expect(run('bulletList', '«- [ ] a»')).toBe('«- a»');
  });

  it('toggles a heading, and swaps one depth for another', () => {
    expect(run('heading2', 'Title|')).toBe('«## Title»');
    expect(run('heading3', '## Ti|tle')).toBe('«### Title»');
    expect(run('heading2', '## Ti|tle')).toBe('«Title»');
    expect(run('paragraph', '### Ti|tle')).toBe('«Title»');
  });

  it('keeps the indentation a line already had', () => {
    expect(run('quote', '  a|')).toBe('«  > a»');
  });
});

describe('blocks', () => {
  it('fences a block and unfences it', () => {
    expect(run('codeBlock', 'a«\nb»')).toBe('«```\na\nb\n```»');
    expect(run('codeBlock', '«```\na\nb\n```»')).toBe('«a\nb»');
  });

  it('gives a rule the blank lines it needs to be one', () => {
    expect(run('rule', 'text|')).toBe('text\n\n---\n|');
  });
});

describe('what is already in force', () => {
  const active = (command: MawyCommand, marked: string) => commandActive(command, at(marked));

  it('sees a wrap from either side of the selection', () => {
    expect(active('bold', 'a «**b**» c')).toBe(true);
    expect(active('bold', 'a **«b»** c')).toBe(true);
    expect(active('bold', 'a «b» c')).toBe(false);
  });

  it('sees a line marker only when every line has it', () => {
    expect(active('bulletList', '«- a\n- b»')).toBe(true);
    expect(active('bulletList', '«- a\nb»')).toBe(false);
    expect(active('heading2', '## a|')).toBe(true);
    expect(active('heading1', '## a|')).toBe(false);
  });
});

describe('Enter, inside a list', () => {
  const enter = (marked: string) => {
    const next = continueList(at(marked));

    return next && show(next);
  };

  it('carries a bullet down to the next line', () => {
    expect(enter('- one|')).toBe('- one\n- |');
  });

  it('counts an ordered list on', () => {
    expect(enter('1. one|')).toBe('1. one\n2. |');
    expect(enter('  9) nine|')).toBe('  9) nine\n  10) |');
  });

  it('carries an unticked box down, never a ticked one', () => {
    expect(enter('- [x] done|')).toBe('- [x] done\n- [ ] |');
  });

  it('takes the marker away when the item is still empty', () => {
    expect(enter('- one\n- |')).toBe('- one\n|');
  });

  it('says nothing about a line that is not a list item', () => {
    expect(enter('just text|')).toBeNull();
    expect(enter('- one «two»')).toBeNull();
  });
});
