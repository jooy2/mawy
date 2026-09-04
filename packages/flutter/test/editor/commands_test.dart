import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

/// The commands, as arithmetic on a string.
///
/// The twin of the React package's `test/internal/commands.test.ts`, and it
/// exists for the reason that file's twin of the search does: `tool/parity.dart`
/// diffs the two *parsers*, so everything else this library ships in two
/// languages has only its doc comments promising the two agree.
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
      expect(run(MawyCommand.heading2, 'Title|'), '«## Title»');
      expect(run(MawyCommand.heading3, '## Ti|tle'), '«### Title»');
      expect(run(MawyCommand.heading2, '## Ti|tle'), '«Title»');
      expect(run(MawyCommand.paragraph, '### Ti|tle'), '«Title»');
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

    test('takes the marker away when the item is still empty', () {
      expect(enter('- one\n- |'), '- one\n|');
    });

    test('carries a definition marker down only where the parser reads one', () {
      expect(enter('Apple\n: A fruit.|'), 'Apple\n: A fruit.\n: |');
      expect(continueList(at('Apple\n: A fruit.|'), definitionLists: false), isNull);
      expect(show(continueList(at('- one|'), definitionLists: false)!), '- one\n- |');
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
      expect(tab('  one|', out: true), '«one»');
    });
  });
}
