import { describe, expect, it } from 'vitest';
import {
  commandActive,
  continueList,
  continueTable,
  indent,
  runCommand,
  runTableCommand,
  type EditState,
  type MawyCommand,
  type MawyTableCommand
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
    expect(run('heading2', 'Title|')).toBe('## Title|');
    expect(run('heading3', '## Ti|tle')).toBe('### Ti|tle');
    expect(run('heading2', '## Ti|tle')).toBe('Ti|tle');
    expect(run('paragraph', '### Ti|tle')).toBe('Ti|tle');
  });

  it('keeps a caret among the words it was among, and a whole line selected', () => {
    // A caret selected into the whole line was typed over by the next letter,
    // which on the drawn document is the marker and all.
    expect(run('bulletList', 'one t|wo')).toBe('- one t|wo');
    expect(run('taskList', '- one t|wo')).toBe('- [ ] one t|wo');
    expect(run('bulletList', '- o«ne t»wo')).toBe('o«ne t»wo');
    expect(run('orderedList', '|one')).toBe('1. |one');
    expect(run('heading1', '«Title»')).toBe('«# Title»');
  });

  it('writes a marker on an empty line, for the words still to come', () => {
    expect(run('bulletList', 'One.\n\n|')).toBe('One.\n\n- |');
    expect(run('taskList', '|')).toBe('- [ ] |');
    expect(run('orderedList', '|')).toBe('1. |');
    expect(run('quote', '|')).toBe('> |');
    expect(run('heading2', '|')).toBe('## |');
    expect(run('bulletList', '  |')).toBe('  - |');
  });

  it('keeps the indentation a line already had', () => {
    expect(run('quote', '  a|')).toBe('  > a|');
  });

  /**
   * A blank line is a paragraph break, and what a marker on it means depends on
   * the marker. A quotation without one on it is two quotations; a list with one
   * on it is an empty item somebody has to delete.
   */
  it('marks a blank line inside a quotation and leaves one inside a list', () => {
    expect(run('quote', '«a\n\nb»')).toBe('«> a\n>\n> b»');
    expect(run('bulletList', '«a\n\nb»')).toBe('«- a\n\n- b»');
    expect(run('taskList', '«a\n\nb»')).toBe('«- [ ] a\n\n- [ ] b»');
    // Which is the answer an ordered list has always given.
    expect(run('orderedList', '«a\n\nb»')).toBe('«1. a\n\n2. b»');
  });

  it('carries a definition marker down only where the parser reads one', () => {
    const at = (value: string) => ({ value, start: value.length, end: value.length });

    expect(continueList(at('Term\n: what it means'))?.value).toBe('Term\n: what it means\n: ');
    // An editor told not to read definition lists is editing a document where
    // that line is a paragraph, and `Enter` on a paragraph is `Enter`.
    expect(continueList(at('Term\n: what it means'), false)).toBe(null);
    // Every other marker is a marker either way.
    expect(continueList(at('- one'), false)?.value).toBe('- one\n- ');
  });

  it('acts on a blank first line with the caret in front of everything', () => {
    // Asked to look from before the start, JavaScript's `lastIndexOf` looks at
    // the first character instead, so a document opening with a line ending
    // had its first line read as starting after that line ending and ending
    // before it, and the command wrote the line ending in twice.
    expect(run('bulletList', '|\nWords.')).toBe('- |\nWords.');
    expect(run('heading1', '|\nWords.')).toBe('# |\nWords.');
    expect(run('quote', '|\nWords.')).toBe('> |\nWords.');
    expect(run('codeBlock', '|\nWords.')).toBe('«```\n\n```»\nWords.');
  });

  it('reads a heading off the lines with something on them', () => {
    // A blank line is not a heading that failed to be one, so a selection with
    // a paragraph break in it still toggles off.
    expect(run('heading2', '«## a\n\n## b»')).toBe('«a\n\nb»');
    expect(run('heading2', '«a\n\nb»')).toBe('«## a\n\n## b»');
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

  it('carries a definition marker down, and gives it up on an empty one', () => {
    // The `:` behaves exactly as a bullet does, which is why it is on the same
    // list rather than beside it.
    expect(enter('Apple\n: A fruit.|')).toBe('Apple\n: A fruit.\n: |');
    expect(enter('Apple\n: A fruit.\n: |')).toBe('Apple\n: A fruit.\n|');
  });

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

  it('carries the marker down from the line an item runs on over', () => {
    // A hard break, or a line wrapped by hand: the second line has no marker
    // of its own and is still the item's.
    expect(enter('- one\n- two  \n  more|\n\nAfter.')).toBe(
      '- one\n- two  \n  more\n- |\n\nAfter.'
    );
    expect(enter('1. one\n   more|')).toBe('1. one\n   more\n2. |');
    expect(enter('- one\n  - two\n    more|')).toBe('- one\n  - two\n    more\n  - |');
    // Code inside an item is the characters it is.
    expect(enter('- one\n\n  ```\n  code|\n  ```')).toBeNull();
  });

  it('says nothing about a line that is not a list item', () => {
    expect(enter('just text|')).toBeNull();
    expect(enter('- one «two»')).toBeNull();
  });
});

/**
 * `Tab` and `Shift`+`Tab`.
 *
 * Two spaces rather than four, and that is a Markdown fact rather than a taste:
 * four spaces under a list that has ended is an indented code block, and two is
 * what every nested item already written is indented by.
 */
describe('indenting', () => {
  const tab = (marked: string, out = false): string => show(indent(at(marked), out));

  it('puts the indentation in where the caret is, with nothing selected', () => {
    expect(tab('one|')).toBe('one  |');
    expect(tab('o|ne')).toBe('o  |ne');
  });

  it('moves the lines a selection touches rather than replacing it', () => {
    // A `Tab` that eats the paragraph somebody had selected is the behaviour
    // every editor gave up.
    expect(tab('«one»')).toBe('«  one»');
    expect(tab('- one\n«- two\n- three»')).toBe('- one\n«  - two\n  - three»');
  });

  it('takes a tab or up to two spaces off, going the other way', () => {
    expect(tab('«  one»', true)).toBe('«one»');
    expect(tab('« one»', true)).toBe('«one»');
    expect(tab('«\tone»', true)).toBe('«one»');
  });

  it('outdents a line with nothing to take off, and the block still moves', () => {
    expect(tab('«one\n  two»', true)).toBe('«one\ntwo»');
  });

  it('outdents from a caret too, because there is nothing else it could mean', () => {
    expect(tab('  one|', true)).toBe('one|');
  });
});

/**
 * Tables, where `|` is the thing being edited, so the caret is `^` instead.
 */
describe('tables', () => {
  const put = (marked: string): EditState => {
    const start = marked.indexOf('^');

    return { value: marked.replace('^', ''), start, end: start };
  };
  const shown = (state: EditState | null) =>
    state && state.value.slice(0, state.start) + '^' + state.value.slice(state.start);
  const table = (command: MawyTableCommand, marked: string) =>
    shown(runTableCommand(command, put(marked)));

  const TABLE = ['| a | b |', '| :-- | --: |', '| c | `d\\|e` |'].join('\n');

  it('inserts an empty table of two columns with a blank line either side', () => {
    expect(table('insertTable', 'Before.^After.')).toBe(
      'Before.\n\n|  ^|  |\n| --- | --- |\n|  |  |\n\nAfter.'
    );
    expect(table('insertTable', '^')).toBe('|  ^|  |\n| --- | --- |\n|  |  |');
    // Not inside a table that is already there.
    expect(table('insertTable', TABLE.replace('c', 'c^'))).toBe(null);
  });

  it('inserts a table inside the quotation or list item the caret is in', () => {
    expect(table('insertTable', '> Quoted.^')).toBe(
      '> Quoted.\n>\n> |  ^|  |\n> | --- | --- |\n> |  |  |'
    );
    expect(table('insertTable', '> One.^\n> Two.')).toBe(
      '> One.\n>\n> |  ^|  |\n> | --- | --- |\n> |  |  |\n>\n> Two.'
    );
    expect(table('insertTable', '> Before.^After.')).toBe(
      '> Before.\n>\n> |  ^|  |\n> | --- | --- |\n> |  |  |\n>\n> After.'
    );
    expect(table('insertTable', '> One.\n> ^')).toBe(
      '> One.\n> \n> |  ^|  |\n> | --- | --- |\n> |  |  |'
    );
    expect(table('insertTable', '- Item.^\n- Next.')).toBe(
      '- Item.\n\n  |  ^|  |\n  | --- | --- |\n  |  |  |\n\n- Next.'
    );
    // A list item with nothing in it yet takes the table as its first block.
    expect(table('insertTable', '- One.\n- ^')).toBe(
      '- One.\n- |  ^|  |\n  | --- | --- |\n  |  |  |'
    );
    expect(table('insertTable', '- > Nested.^')).toBe(
      '- > Nested.\n  >\n  > |  ^|  |\n  > | --- | --- |\n  > |  |  |'
    );
  });

  it('does nothing inside a code block or a block of HTML', () => {
    expect(table('insertTable', '```\nco^de\n```')).toBe(null);
    expect(table('insertTable', '```\ncode^')).toBe(null);
    expect(table('insertTable', '    co^de')).toBe(null);
    expect(table('insertTable', '> ```\n> co^de\n> ```')).toBe(null);
    expect(table('insertTable', '<div>\nwo^rds\n</div>')).toBe(null);
    // At the very end of a quotation or a list item whose code nothing closes,
    // which is still inside the code as well as at the container's edge.
    expect(table('insertTable', '> ```\n> code^')).toBe(null);
    expect(table('insertTable', '- ```\n  code^')).toBe(null);
    expect(table('insertTable', '- item\n\n      code^')).toBe(null);
    expect(table('insertTable', '    code^')).toBe(null);
    // After the closing fence is after the block.
    expect(table('insertTable', '```\ncode\n```^')).toBe(
      '```\ncode\n```\n\n|  ^|  |\n| --- | --- |\n|  |  |'
    );
  });

  it('adds a row under the caret and above it, but never above the header', () => {
    expect(table('addRowBelow', TABLE.replace('c', 'c^'))).toBe(`${TABLE}\n|  ^|  |`);
    expect(table('addRowBelow', TABLE.replace('a', 'a^'))).toBe(
      ['| a | b |', '| :-- | --: |', '|  ^|  |', '| c | `d\\|e` |'].join('\n')
    );
    expect(table('addRowAbove', TABLE.replace('`d', '`^d'))).toBe(
      ['| a | b |', '| :-- | --: |', '|  |  ^|', '| c | `d\\|e` |'].join('\n')
    );
    expect(table('addRowAbove', TABLE.replace('a', 'a^'))).toBe(null);
  });

  it('removes a body row, and leaves the header alone', () => {
    expect(table('removeRow', `${TABLE}\n| x | y |`.replace('c', 'c^'))).toBe(
      ['| a | b |', '| :-- | --: |', '| x^ | y |'].join('\n')
    );
    expect(table('removeRow', TABLE.replace('b', 'b^'))).toBe(null);
  });

  it('adds a column either side, keeping the alignment and what is in the cells', () => {
    expect(table('addColumnAfter', TABLE.replace('a', 'a^'))).toBe(
      ['| a |  ^| b |', '| :-- | --- | --: |', '| c |  | `d\\|e` |'].join('\n')
    );
    expect(table('addColumnBefore', TABLE.replace('a', 'a^'))).toBe(
      ['|  ^| a | b |', '| --- | :-- | --: |', '|  | c | `d\\|e` |'].join('\n')
    );
  });

  it('adds a column to a table written without pipes at either end', () => {
    expect(table('addColumnAfter', 'a | b^\n--- | ---\nc | d')).toBe(
      'a | b |  ^|\n--- | --- | --- |\nc | d |  |'
    );
    expect(table('addColumnBefore', 'a^ | b\n--- | ---\nc | d')).toBe(
      '|  ^| a | b\n| --- | --- | ---\n|  | c | d'
    );
  });

  it('removes a column, but not the last one', () => {
    expect(table('removeColumn', TABLE.replace('b', 'b^'))).toBe(
      ['| a^ |', '| :-- |', '| c |'].join('\n')
    );
    expect(table('removeColumn', 'a | b^\n--- | ---')).toBe('a^ |\n---');
    expect(table('removeColumn', '| a^ |\n| --- |')).toBe(null);
  });

  it('carries the prefix of a quotation onto a row it adds', () => {
    expect(table('addRowBelow', '> | a^ |\n> | --- |')).toBe('> | a |\n> | --- |\n> |  ^|');
  });

  it('does nothing outside a table, or to pipes in a code block', () => {
    expect(table('addRowBelow', 'Just^ words.')).toBe(null);
    expect(table('addRowBelow', '```\n| a^ |\n| --- |\n```')).toBe(null);
  });

  it('carries Enter down a row, and leaves the table from a row still empty', () => {
    expect(shown(continueTable(put(TABLE.replace('c', 'c^'))))).toBe(`${TABLE}\n|  ^|  |`);
    expect(shown(continueTable(put(`${TABLE}\n|  ^|  |`)))).toBe(`${TABLE}\n\n^`);
    expect(shown(continueTable(put(`${TABLE}\n|  ^|  |\n\nAfter.`)))).toBe(
      `${TABLE}\n\n^\n\nAfter.`
    );
    expect(continueTable(put('Not^ a table.'))).toBe(null);
  });

  it('leaves a table inside a quotation or a list item for a line still inside it', () => {
    expect(shown(continueTable(put('> | a |\n> | - |\n> | x |\n> |  ^|\n>\n> After.')))).toBe(
      '> | a |\n> | - |\n> | x |\n>\n> ^\n>\n> After.'
    );
    expect(shown(continueTable(put('- item\n\n  | a |\n  | - |\n  |  ^|')))).toBe(
      '- item\n\n  | a |\n  | - |\n\n  ^'
    );
  });

  it('reads a row of nothing but a space no parser trims the same way both packages do', () => {
    // A no-break space is a row to the parser and trims away to nothing, which
    // leaves a cell whose end is before its start unless it is kept in order.
    expect(table('removeColumn', '| a | b |\n| - | - |\n\u00a0^')).toBe('| b |\n| - |\n\u00a0|^');
  });
});
