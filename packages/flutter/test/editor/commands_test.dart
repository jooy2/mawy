import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/editor/commands.dart'
    show
        MawyCrowding,
        MawyTableCommand,
        crowdedBy,
        hardBreak,
        runTableCommand,
        tableAlignAt,
        tableOfSize;

/// The commands, as arithmetic on a string.
///
/// The twin of the React package's `test/internal/commands.test.ts`, and it
/// exists for the reason `search_test.dart` beside it does: `tool/parity.dart`
/// diffs the two implementations against each other, which says they agree and
/// says nothing about whether they are right, and this says which.
///
/// They are pure functions of `(value, start, end)` precisely so that this file
/// does not have to mount an editor to find out what `Mod`+`B` does to a list
/// item.

/// `'a|b'` is the caret there; `'a«bc»d'` is that selection.
///
/// Guillemets rather than square brackets, because half of what a Markdown
/// command is run on — a link, a task box, a reference — is made of square
/// brackets, and a notation that collides with its own subject matter reads
/// every one of those cases wrong.
EditState at(String marked) {
  if (marked.contains('|')) {
    final int start = marked.indexOf('|');

    return EditState(marked.replaceFirst('|', ''), start, start);
  }

  final int start = marked.indexOf('«');
  final int end = marked.indexOf('»') - 1;

  return EditState(marked.replaceFirst('«', '').replaceFirst('»', ''), start, end);
}

/// The result, written back in the same notation.
String show(EditState state) {
  final String value = state.value;

  return state.start == state.end
      ? '${value.substring(0, state.start)}|${value.substring(state.start)}'
      : '${value.substring(0, state.start)}«${value.substring(state.start, state.end)}»'
            '${value.substring(state.end)}';
}

String run(MawyCommand command, String marked) => show(runCommand(command, at(marked)));

void main() {
  group('wrapping', () {
    test('wraps a selection, and leaves it around the same words', () {
      expect(run(MawyCommand.bold, 'one «two» three'), 'one **«two»** three');
      expect(run(MawyCommand.italic, 'one «two» three'), 'one _«two»_ three');
      expect(run(MawyCommand.strikethrough, 'one «two» three'), 'one ~~«two»~~ three');
      expect(run(MawyCommand.code, 'one «two» three'), 'one `«two»` three');
    });

    test('leaves the caret between the markers when nothing is selected', () {
      expect(run(MawyCommand.bold, 'one | three'), 'one **|** three');
    });

    test('unwraps from either side of the selection', () {
      expect(run(MawyCommand.bold, 'one «**two**» three'), 'one «two» three');
      expect(run(MawyCommand.bold, 'one **«two»** three'), 'one «two» three');
    });
  });

  group('links', () {
    test('puts the selection in the label and offers the destination to type over', () {
      expect(run(MawyCommand.link, 'see «the docs» here'), 'see [the docs](«url») here');
    });

    test('recognises a selected URL as the destination rather than the label', () {
      expect(
        run(MawyCommand.link, 'see «https://a.example» here'),
        'see [|](https://a.example) here',
      );
    });

    test('writes an image as the same thing with a `!` in front of it', () {
      expect(run(MawyCommand.image, 'see «a cat» here'), 'see ![a cat](«url») here');
      expect(run(MawyCommand.image, 'here |'), 'here ![](«url»)');
    });
  });

  group('line markers', () {
    test('toggles a quotation over every line the selection touches', () {
      expect(run(MawyCommand.quote, 'a«\nb\nc»'), '«> a\n> b\n> c»');
      expect(run(MawyCommand.quote, '«> a\n> b»'), '«a\nb»');
    });

    test('numbers an ordered list, and replaces one marker with another', () {
      expect(run(MawyCommand.orderedList, 'a«\nb\nc»'), '«1. a\n2. b\n3. c»');
      expect(run(MawyCommand.bulletList, '«1. a\n2. b»'), '«- a\n- b»');
      expect(run(MawyCommand.taskList, '«- a»'), '«- [ ] a»');
    });

    test('toggles a heading, and swaps one depth for another', () {
      expect(run(MawyCommand.heading2, 'Title|'), '## Title|');
      expect(run(MawyCommand.heading3, '## Ti|tle'), '### Ti|tle');
      expect(run(MawyCommand.heading2, '## Ti|tle'), 'Ti|tle');
      expect(run(MawyCommand.paragraph, '### Ti|tle'), 'Ti|tle');
    });

    test('keeps a caret among the words it was among, and a whole line selected', () {
      expect(run(MawyCommand.bulletList, 'one t|wo'), '- one t|wo');
      expect(run(MawyCommand.taskList, '- one t|wo'), '- [ ] one t|wo');
      expect(run(MawyCommand.bulletList, '- o«ne t»wo'), 'o«ne t»wo');
      expect(run(MawyCommand.orderedList, '|one'), '1. |one');
      expect(run(MawyCommand.heading1, '«Title»'), '«# Title»');
    });

    test('writes a marker on an empty line, for the words still to come', () {
      expect(run(MawyCommand.bulletList, 'One.\n\n|'), 'One.\n\n- |');
      expect(run(MawyCommand.taskList, '|'), '- [ ] |');
      expect(run(MawyCommand.orderedList, '|'), '1. |');
      expect(run(MawyCommand.quote, '|'), '> |');
      expect(run(MawyCommand.heading2, '|'), '## |');
      expect(run(MawyCommand.bulletList, '  |'), '  - |');
    });

    test('marks a blank line inside a quotation and leaves one inside a list', () {
      expect(run(MawyCommand.quote, '«a\n\nb»'), '«> a\n>\n> b»');
      expect(run(MawyCommand.bulletList, '«a\n\nb»'), '«- a\n\n- b»');
      expect(run(MawyCommand.orderedList, '«a\n\nb»'), '«1. a\n\n2. b»');
    });

    test('reads a heading off the lines with something on them', () {
      expect(run(MawyCommand.heading2, '«## a\n\n## b»'), '«a\n\nb»');
      expect(run(MawyCommand.heading2, '«a\n\nb»'), '«## a\n\n## b»');
    });
  });

  group('cells selected in a table', () {
    const String v = '| a | b | c |\n| - | - | - |\n| d | e | f |\n| g | h | i |';
    EditState over(String from, String to) => EditState(v, v.indexOf(from), v.indexOf(to) + 1);

    test('acts on as many rows and columns as the selection covers', () {
      expect(
        runTableCommand(MawyTableCommand.removeRow, over('d', 'h'))?.value,
        '| a | b | c |\n| - | - | - |',
      );
      expect(
        runTableCommand(MawyTableCommand.addRowBelow, over('d', 'h'))?.value,
        '$v\n|  |  |  |\n|  |  |  |',
      );
      expect(
        runTableCommand(MawyTableCommand.removeColumn, over('b', 'f'))?.value,
        '| a |\n| - |\n| d |\n| g |',
      );
    });

    test('never takes the header or every column', () {
      expect(runTableCommand(MawyTableCommand.removeRow, over('b', 'e')), isNull);
      expect(runTableCommand(MawyTableCommand.removeColumn, over('a', 'i')), isNull);
    });

    test('empties the cells it covers and leaves the table its shape', () {
      expect(
        runTableCommand(MawyTableCommand.clearCells, over('e', 'i'))?.value,
        '| a | b | c |\n| - | - | - |\n| d |  |  |\n| g |  |  |',
      );
      const String bare = 'a | b\n--- | ---\nc | d';

      expect(
        runTableCommand(MawyTableCommand.clearCells, const EditState(bare, 0, bare.length))?.value,
        '|  |  |\n--- | ---\n|  |  |',
      );
    });
  });

  group('tables', () {
    test('makes no block of a row, which a cell has no room for', () {
      const EditState state = EditState('Intro.\n\n| a | b |\n| - | - |', 12, 12);

      for (final MawyCommand command in <MawyCommand>[
        MawyCommand.heading1,
        MawyCommand.paragraph,
        MawyCommand.quote,
        MawyCommand.codeBlock,
        MawyCommand.rule,
      ]) {
        expect(identical(runCommand(command, state), state), isTrue, reason: command.name);
      }

      expect(
        runCommand(
          MawyCommand.bold,
          const EditState('Intro.\n\n| a | b |\n| - | - |', 10, 11),
        ).value,
        'Intro.\n\n| **a** | b |\n| - | - |',
      );
    });

    test('leaves a pipe on every line of a table written without its outer ones', () {
      String removed(String value, int at) =>
          runTableCommand(MawyTableCommand.removeColumn, EditState(value, at, at))!.value;

      expect(removed('a | b\n--- | ---\nc | d', 0), 'b |\n--- |\nd |');
      expect(removed('a | b\n- | -\n1 | 2\n3 | 4', 21), 'a |\n- |\n1 |\n3 |');
      expect(removed('> a | b | e\n> --- | --- | ---', 2), '> b | e\n> --- | ---');
    });

    test('inserts a table of the size asked for, the header counted among the rows', () {
      expect(
        tableOfSize(const EditState('', 0, 0), 3, 1)?.value,
        '|  |  |  |\n| --- | --- | --- |',
      );
      expect(
        tableOfSize(const EditState('Intro.', 6, 6), 1, 3)?.value,
        'Intro.\n\n|  |\n| --- |\n|  |\n|  |',
      );
    });
  });

  group('removing a table', () {
    String? removed(String marked) {
      final int at = marked.indexOf('^');
      final EditState? after = runTableCommand(
        MawyTableCommand.removeTable,
        EditState(marked.replaceFirst('^', ''), at, at),
      );

      return after == null
          ? null
          : '${after.value.substring(0, after.start)}^${after.value.substring(after.start)}';
    }

    test('takes its lines out, and one of the blank lines either side of it', () {
      expect(removed('Intro.\n\n| a^ |\n| - |\n\nAfter.'), 'Intro.\n\n^After.');
      expect(removed('Intro.\n\n| a^ |\n| - |'), 'Intro.^');
      expect(removed('| a^ |\n| - |\n\nAfter.'), '^After.');
      expect(removed('> Intro.\n>\n> | a^ |\n> | - |\n>\n> After.'), '> Intro.\n>\n^> After.');
      expect(removed('Words.^'), isNull);
    });
  });

  group('aligning columns', () {
    const String v = '| a | b | c |\n| :-- | --- | --: |\n| d | e | f |';
    EditState over(String from, String to) =>
        EditState(v, v.indexOf(from), v.indexOf(to) + (from == to ? 0 : 1));

    test(
      'writes the colons into the delimiter cell of the column the caret is in, and takes them back off',
      () {
        expect(
          runTableCommand(MawyTableCommand.alignCenter, over('e', 'e'))?.value,
          '| a | b | c |\n| :-- | :---: | --: |\n| d | e | f |',
        );
        expect(
          runTableCommand(MawyTableCommand.alignLeft, over('d', 'd'))?.value,
          '| a | b | c |\n| -- | --- | --: |\n| d | e | f |',
        );
        expect(
          runTableCommand(MawyTableCommand.alignLeft, over('f', 'f'))?.value,
          '| a | b | c |\n| :-- | --- | :-- |\n| d | e | f |',
        );
      },
    );

    test('aligns every column the selection covers, and says how they are aligned', () {
      expect(
        runTableCommand(MawyTableCommand.alignRight, over('d', 'e'))?.value,
        '| a | b | c |\n| --: | ---: | --: |\n| d | e | f |',
      );
      expect(tableAlignAt(v, v.indexOf('f'), v.indexOf('f')), 'right');
      expect(tableAlignAt(v, v.indexOf('e'), v.indexOf('e')), 'none');
      expect(tableAlignAt(v, v.indexOf('d'), v.indexOf('e') + 1), isNull);
      expect(tableAlignAt('No table.', 0, 0), isNull);
    });
  });

  group('lists in a cell', () {
    const String head = '| h | i |\n| - | - |\n';

    /// A row under a header, with `^` for the caret and `«»` around a selection.
    EditState row(String marked) {
      final String value = head + marked.replaceAll(RegExp('[\\^«»]'), '');
      final int caret = marked.indexOf('^');
      final int start = caret == -1 ? marked.indexOf('«') : caret;
      final int end = caret == -1 ? marked.indexOf('»') - 1 : caret;

      return EditState(value, head.length + start, head.length + end);
    }

    String list(MawyCommand command, String marked) {
      final EditState after = runCommand(command, row(marked));
      final String value = after.value;
      final String shown = after.start == after.end
          ? '${value.substring(0, after.start)}^${value.substring(after.start)}'
          : '${value.substring(0, after.start)}«${value.substring(after.start, after.end)}»'
                '${value.substring(after.end)}';

      return shown.substring(head.length);
    }

    test(
      'writes a marker at the start of the line of the cell the caret is on, or takes it off',
      () {
        expect(list(MawyCommand.bulletList, '| a^ | x |'), '| - a^ | x |');
        expect(list(MawyCommand.taskList, '| a<br>^b | x |'), '| a<br>- [ ] ^b | x |');
        expect(list(MawyCommand.bulletList, '| - a^ | x |'), '| a^ | x |');
        expect(list(MawyCommand.orderedList, '| - a^ | x |'), '| 1. a^ | x |');
      },
    );

    test('gives a line with nothing on it a marker, set off from the pipe after it', () {
      expect(list(MawyCommand.bulletList, '|  ^| x |'), '| - ^ | x |');
      expect(list(MawyCommand.orderedList, '| 1. a<br>^ | x |'), '| 1. a<br>2. ^ | x |');
    });

    test('numbers the lines a selection covers, again in every cell', () {
      expect(
        list(MawyCommand.orderedList, '| «a<br><br>b | x» |'),
        '| 1. «a<br><br>2. b | 1. x» |',
      );
    });

    test('gives a row written without its outer pipes the one a marker would take', () {
      expect(list(MawyCommand.bulletList, 'a^ | x'), '| - a^ | x');
    });

    test(
      'nests the item on a line of a cell with Tab, and leaves the rest of a table to indent',
      () {
        String nested(String marked, {bool out = false}) {
          final EditState after = indent(row(marked), out: out);

          return '${after.value.substring(0, after.start)}^${after.value.substring(after.start)}'
              .substring(head.length);
        }

        expect(nested('| - a<br>- b^ | x |'), '| - a<br>  - b^ | x |');
        expect(nested('| - a<br>  - b^ | x |', out: true), '| - a<br>- b^ | x |');
        expect(nested('| - a^<br>- b | x |'), '| - a^<br>- b | x |');
        expect(nested('| a^ | x |'), '| a  ^ | x |');
      },
    );

    test('sees the list the lines of a cell are in', () {
      expect(commandActive(MawyCommand.orderedList, row('| 1. a<br>2. b^ | x |')), isTrue);
      expect(commandActive(MawyCommand.bulletList, row('| 1. a<br>2. b^ | x |')), isFalse);
      expect(commandActive(MawyCommand.bulletList, row('| a^ | - x |')), isFalse);
    });
  });

  group('blocks', () {
    test('fences the line a caret is on with the caret inside, and unfences from inside', () {
      expect(run(MawyCommand.codeBlock, 'co|de'), '```\nco|de\n```');
      expect(run(MawyCommand.codeBlock, 'Above.\n\n|'), 'Above.\n\n```\n|\n```');
      expect(run(MawyCommand.codeBlock, '```ts\none\ntw|o\n```'), 'one\ntw|o');
      expect(
        run(MawyCommand.codeBlock, 'Above.\n\n```\n|\n```\n\nBelow.'),
        'Above.\n\n|\n\nBelow.',
      );
      expect(run(MawyCommand.codeBlock, '- ```\n  co|de\n  ```'), '- co|de');
    });
  });

  group('what is already in force', () {
    bool active(MawyCommand command, String marked) => commandActive(command, at(marked));

    test('sees a wrap from either side of the selection', () {
      expect(active(MawyCommand.bold, 'a «**b**» c'), isTrue);
      expect(active(MawyCommand.bold, 'a **«b»** c'), isTrue);
      expect(active(MawyCommand.bold, 'a «b» c'), isFalse);
    });

    test('does not see a wrap in a selection too short to hold one', () {
      // The markers have to be inside the selection *and* have something
      // between them, or `«**»` reads as bold with nothing in it.
      expect(active(MawyCommand.bold, 'a «**» c'), isFalse);
      expect(active(MawyCommand.code, 'a «`» c'), isFalse);
    });

    test('sees a code block from anywhere inside it', () {
      expect(active(MawyCommand.codeBlock, '```\nco|de\n```'), isTrue);
      expect(active(MawyCommand.codeBlock, 'co|de'), isFalse);
      expect(active(MawyCommand.codeBlock, '    co|de'), isFalse);
    });

    test('sees a line marker only when every line has it', () {
      expect(active(MawyCommand.bulletList, '«- a\n- b»'), isTrue);
      expect(active(MawyCommand.bulletList, '«- a\nb»'), isFalse);
      expect(active(MawyCommand.heading2, '## a|'), isTrue);
      expect(active(MawyCommand.heading1, '## a|'), isFalse);
    });

    test('reads past the blank lines and says no about a selection of them', () {
      expect(active(MawyCommand.heading2, '«## a\n\n## b»'), isTrue);
      expect(active(MawyCommand.heading2, '«\n\n»'), isFalse);
    });
  });

  group('Enter, inside a list', () {
    String? enter(String marked) {
      final EditState? next = continueList(at(marked));

      return next == null ? null : show(next);
    }

    test('carries a bullet down, and counts an ordered list on', () {
      expect(enter('- one|'), '- one\n- |');
      expect(enter('1. one|'), '1. one\n2. |');
      expect(enter('  9) nine|'), '  9) nine\n  10) |');
    });

    test('carries an unticked box down, never a ticked one', () {
      expect(enter('- [x] done|'), '- [x] done\n- [ ] |');
    });

    test('takes the marker away when the item is still empty, and parts it from the list', () {
      // A blank line between, or the letter typed where the bullet was is the
      // last item's lazy continuation and the next `Enter` carries the marker
      // back down. See `_partedFrom`.
      expect(enter('- one\n- |'), '- one\n\n|');
      expect(enter('- |'), '|');
      // Nothing to be parted from, and nothing that would make a third line
      // ending in a row.
      expect(enter('\n- |'), '\n|');
      expect(enter('- one\n- |\n- two'), '- one\n|\n- two');
    });

    test('carries a definition marker down only where the parser reads one', () {
      expect(enter('Apple\n: A fruit.|'), 'Apple\n: A fruit.\n: |');
      expect(continueList(at('Apple\n: A fruit.|'), definitionLists: false), isNull);
      expect(show(continueList(at('- one|'), definitionLists: false)!), '- one\n- |');
    });

    test('carries the marker down from the line an item runs on over', () {
      expect(enter('- one\n- two  \n  more|\n\nAfter.'), '- one\n- two  \n  more\n- |\n\nAfter.');
      expect(enter('1. one\n   more|'), '1. one\n   more\n2. |');
      expect(enter('- one\n  - two\n    more|'), '- one\n  - two\n    more\n  - |');
      expect(enter('- one\n\n  ```\n  code|\n  ```'), isNull);
    });

    test('says nothing about a line that is not a list item', () {
      expect(enter('just text|'), isNull);
      expect(enter('- one «two»'), isNull);
    });
  });

  /// Two spaces rather than four, and that is a Markdown fact rather than a
  /// taste: four spaces under a list that has ended is an indented code block,
  /// and two is what every nested item already written is indented by.
  group('indenting', () {
    String tab(String marked, {bool out = false}) => show(indent(at(marked), out: out));

    test('puts the indentation in where the caret is, with nothing selected', () {
      expect(tab('one|'), 'one  |');
      expect(tab('o|ne'), 'o  |ne');
    });

    test('moves the lines a selection touches rather than replacing it', () {
      expect(tab('«one»'), '«  one»');
      expect(tab('- one\n«- two\n- three»'), '- one\n«  - two\n  - three»');
    });

    test('takes a tab or up to two spaces off, going the other way', () {
      expect(tab('«  one»', out: true), '«one»');
      expect(tab('« one»', out: true), '«one»');
      expect(tab('«\tone»', out: true), '«one»');
    });

    test('outdents from a caret too, because there is nothing else it could mean', () {
      expect(tab('  one|', out: true), 'one|');
    });

    test('makes a list item an item of the one above it, and back', () {
      expect(tab('- one\n- tw|o'), '- one\n  - tw|o');
      expect(tab('- one\n  - tw|o', out: true), '- one\n- tw|o');
      expect(tab('1. one\n2. tw|o'), '1. one\n   1. tw|o');
      expect(tab('1. one\n   1. tw|o', out: true), '1. one\n2. tw|o');
    });

    test('counts a list an item joins on from its last number', () {
      expect(tab('1. one\n   1. a\n   2. b\n2. tw|o'), '1. one\n   1. a\n   2. b\n   3. tw|o');
    });

    test('takes what an item holds with it', () {
      expect(
        tab('- one\n- tw|o\n  more\n  - three\n- four'),
        '- one\n  - tw|o\n    more\n    - three\n- four',
      );
      expect(tab('- one\n- two\n  mo|re'), '- one\n  - two\n    mo|re');
    });

    test('leaves the first item of a list where it is, and an outermost item too', () {
      expect(tab('- on|e\n- two'), '- on|e\n- two');
      expect(tab('Words.\n\n- on|e'), 'Words.\n\n- on|e');
      expect(tab('- one\n  mo|re', out: true), '- one\n  mo|re');
    });
  });

  group('one space and one blank line', () {
    /// `'a |b'` is the document as the keystroke would leave it, with the caret.
    MawyCrowding? after(String marked) =>
        crowdedBy(marked.replaceFirst('|', ''), marked.indexOf('|'));

    test('refuses a second space in a row, and nothing less', () {
      expect(after('one |two'), isNull);
      expect(after('one  |two'), MawyCrowding.space);
      expect(after('one | two'), MawyCrowding.space);
      expect(after('one   |two'), MawyCrowding.space);
      // Markdown throws away the whitespace at the end of a line, so two spaces
      // there are as invisible as two between words.
      expect(after('one  |'), MawyCrowding.space);
    });

    test('leaves the whitespace a line opens with alone', () {
      expect(after('- one\n    |- two'), isNull);
      expect(after('  |  code'), isNull);
    });

    test('refuses a second blank line in a row, and nothing less', () {
      expect(after('one\n|two'), isNull);
      expect(after('one\n\n|two'), isNull);
      expect(after('one\n\n\n|two'), MawyCrowding.breaks);
      expect(after('one\n\n|'), isNull);
      expect(after('one\n\n\n|'), MawyCrowding.breaks);
    });

    test('leaves code, raw HTML and a table alone', () {
      expect(after('```\ncode  |\n```'), isNull);
      expect(after('```\ncode\n\n\n|\n```'), isNull);
      expect(after('<div>\n  a  |b\n</div>'), isNull);
      expect(after('| a |  |\n| --- | --- |'), isNull);
    });
  });

  group('a hard break', () {
    String broken(String marked) => show(hardBreak(at(marked)));

    test('writes the two spaces a break is made of', () {
      expect(broken('one|two'), 'one  \n|two');
      expect(broken('- a|'), '- a  \n|');
    });

    test('writes a line ending inside a code block, where a character is itself', () {
      expect(broken('```\nco|de\n```'), '```\nco\n|de\n```');
      expect(broken('    co|de'), '    co\n|de');
    });

    test('writes a `<br>` in a table cell, whose row is one line of the file', () {
      // Written out rather than marked, because the caret's mark is the
      // character a table is made of.
      const String value = '| a | b |\n| --- | --- |';
      final EditState next = hardBreak(const EditState(value, 3, 3));

      expect(next.value, '| a<br> | b |\n| --- | --- |');
      expect(next.start, 7);
    });

    test('replaces what is selected', () {
      expect(broken('one «two» three'), 'one   \n| three');
    });
  });
}
