/// What a formatting command does to a document.
///
/// Pure functions over `{value, start, end}` and nothing else: no widget, no
/// event, no Flutter. That is what makes them testable at all — the alternative
/// is a test that has to build an editor to find out what Cmd+B does to a list
/// item — and it is what lets `tool/parity.dart` diff them against the React
/// package's, which is where this is from: `src/internal/commands.ts`, function
/// for function.
///
/// Every command is a *toggle*. Pressing Cmd+B on bold text unbolds it, which
/// sounds obvious and is the half people leave out.
library;

/// A document and where the caret is in it.
class EditState {
  /// Creates a state.
  const EditState(this.value, this.start, this.end);

  /// The Markdown.
  final String value;

  /// Where the selection begins.
  final int start;

  /// Where it ends. The same as [start] for a caret.
  final int end;
}

/// One thing the toolbar can do.
enum MawyCommand {
  /// `**bold**`.
  bold,

  /// `_italic_`.
  italic,

  /// `~~struck through~~`.
  strikethrough,

  /// `` `code` ``.
  code,

  /// `[words](url)`.
  link,

  /// `![description](url)`.
  image,

  /// `# `.
  heading1,

  /// `## `.
  heading2,

  /// `### `.
  heading3,

  /// No heading at all.
  paragraph,

  /// `> `.
  quote,

  /// `- `.
  bulletList,

  /// `1. `.
  orderedList,

  /// `- [ ] `.
  taskList,

  /// A fenced block.
  codeBlock,

  /// `---`.
  rule,
}

/* -------------------------------------------------------------------------
 * Lines
 * ---------------------------------------------------------------------- */

/// The offsets of the first and last line the selection touches.
List<int> _lineRange(String value, int start, int end) {
  // `lastIndexOf` from before the beginning is `-1` in JavaScript and an error
  // here, which is the whole of the difference between the two halves of this.
  final int from = start <= 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  final int to = value.indexOf('\n', end > value.length ? value.length : end);

  return <int>[from, to == -1 ? value.length : to];
}

/// Every line the selection touches, rewritten.
///
/// The selection is put back around the whole of the rewritten block rather
/// than being tracked character by character. A command that changes the marker
/// on four lines has no honest answer for "where was the caret" anyway, and
/// leaving the block selected is what lets the next command act on the same
/// lines.
EditState _mapLines(EditState state, List<String> Function(List<String>) rewrite) {
  final List<int> span = _lineRange(state.value, state.start, state.end);
  final int from = span[0];
  final int to = span[1];
  final String block = rewrite(state.value.substring(from, to).split('\n')).join('\n');

  return EditState(
    state.value.substring(0, from) + block + state.value.substring(to),
    from,
    from + block.length,
  );
}

final RegExp _indent = RegExp(r'^[ \t]*');

/// The indentation a line opens with, so a marker goes after it and not before.
String _indentOf(String line) => _indent.firstMatch(line)?.group(0) ?? '';

const String _quote = 'quote';
const String _bulletList = 'bulletList';
const String _taskList = 'taskList';
const String _orderedList = 'orderedList';
const String _heading = 'heading';

final Map<String, RegExp> _markers = <String, RegExp>{
  _quote: RegExp(r'^[ \t]*> ?'),
  _bulletList: RegExp(r'^[ \t]*[-*+] (?!\[[ xX]\] )'),
  _taskList: RegExp(r'^[ \t]*[-*+] \[[ xX]\] '),
  _orderedList: RegExp(r'^[ \t]*\d{1,9}[.)] '),
  _heading: RegExp(r'^[ \t]*#{1,6} '),
};

/// Every marker off the front of a line, so one command can replace another.
String _bare(String line) {
  String out = line;

  for (final RegExp pattern in _markers.values) {
    out = out.replaceFirst(pattern, _indentOf(out));
  }

  return out;
}

/// A marker put on the front of every line the selection touches, or taken off.
///
/// [blanks] says whether a line with nothing on it takes one too, and the two
/// answers are not a preference. A quotation has to write its marker on the
/// blank line between its paragraphs, or what was one quotation with a break in
/// it becomes two quotations. A list must not: a bullet with nothing after it
/// is an empty item somebody has to go back and delete, which is what quoting
/// two paragraphs as a list used to leave behind — and what [_toggleOrdered]
/// beside this has always got right.
EditState _togglePrefix(EditState state, String kind, String prefix, {required bool blanks}) {
  return _mapLines(state, (List<String> lines) {
    final List<String> content = lines.where((String line) => line.trim().isNotEmpty).toList();
    final bool on =
        content.isNotEmpty && content.every((String line) => _markers[kind]!.hasMatch(line));

    return lines.map((String line) {
      if (on) {
        return _bare(line);
      }

      if (line.trim().isEmpty) {
        // The marker without the space after it, there being nothing for the
        // space to be in front of.
        return blanks ? _indentOf(line) + prefix.trimRight() : line;
      }

      return _indentOf(line) + prefix + _bare(line).trimLeft();
    }).toList();
  });
}

EditState _toggleOrdered(EditState state) {
  return _mapLines(state, (List<String> lines) {
    final List<String> content = lines.where((String line) => line.trim().isNotEmpty).toList();
    final bool on =
        content.isNotEmpty &&
        content.every((String line) => _markers[_orderedList]!.hasMatch(line));
    int number = 0;

    return lines.map((String line) {
      if (on) {
        return _bare(line);
      }

      // Blank lines inside the block keep their place and do not take a number.
      if (line.trim().isEmpty) {
        return line;
      }

      number += 1;

      return '${_indentOf(line)}$number. ${_bare(line).trimLeft()}';
    }).toList();
  });
}

/// A heading of this depth over every line the selection touches, or off it.
///
/// Whether it is already on is read from the lines with something on them, the
/// way it is for every other marker: a blank line is not a heading that failed
/// to be one, and counting it as a line that did not match made a selection
/// with a paragraph break in it impossible to toggle off. A blank line is left
/// alone on the way in, too — `# ` on its own is a heading with nothing in it.
EditState _toggleHeading(EditState state, int depth) {
  final String hashes = '#' * depth;
  final RegExp already = RegExp('^[ \\t]*$hashes ');

  return _mapLines(state, (List<String> lines) {
    final List<String> content = lines.where((String line) => line.trim().isNotEmpty).toList();
    final bool on = content.isNotEmpty && content.every((String line) => already.hasMatch(line));

    return lines.map((String line) {
      if (on || depth == 0) {
        return _bare(line);
      }

      return line.trim().isEmpty ? line : '${_indentOf(line)}$hashes ${_bare(line).trimLeft()}';
    }).toList();
  });
}

/* -------------------------------------------------------------------------
 * Wrapping
 * ---------------------------------------------------------------------- */

/// A marker put around the selection, or taken back off it.
///
/// Both sides of "already wrapped" are checked: the markers may be inside the
/// selection, because the reader selected them, or outside it, because they
/// double-tapped the word between them. Only the second is ever thought of.
EditState _toggleWrap(EditState state, String marker) {
  final String value = state.value;
  final int start = state.start;
  final int end = state.end;
  final String selected = value.substring(start, end);
  final int width = marker.length;

  if (selected.length >= width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    final String inner = selected.substring(width, selected.length - width);

    return EditState(
      value.substring(0, start) + inner + value.substring(end),
      start,
      start + inner.length,
    );
  }

  if (_slice(value, start - width, start) == marker && _slice(value, end, end + width) == marker) {
    return EditState(
      value.substring(0, start - width) + selected + value.substring(end + width),
      start - width,
      end - width,
    );
  }

  return EditState(
    value.substring(0, start) + marker + selected + marker + value.substring(end),
    // An empty selection leaves the caret between the two markers, ready to
    // type; a real one stays around the words it was around.
    start + width,
    end + width,
  );
}

/// `String.substring` with JavaScript's manners about the ends.
String _slice(String value, int from, int to) {
  final int a = from < 0 ? 0 : (from > value.length ? value.length : from);
  final int b = to < a ? a : (to > value.length ? value.length : to);

  return value.substring(a, b);
}

/* -------------------------------------------------------------------------
 * Links, code blocks and rules
 * ---------------------------------------------------------------------- */

final RegExp _looksLikeUrl = RegExp(r'^(?:https?://|mailto:|/|\./|#)\S*$');

/// A link, or an image, which is a link written with a `!` in front of it.
///
/// The same command twice over rather than two of them, because the only
/// difference between what they write is that one character — and the halves
/// mean the same things: a URL selected becomes the destination, and anything
/// else becomes the words, or the description a reader who cannot see the
/// image is given.
EditState _insertLink(EditState state, {required bool image}) {
  final String value = state.value;
  final int start = state.start;
  final int end = state.end;
  final String selected = value.substring(start, end);
  final bool isUrl = _looksLikeUrl.hasMatch(selected.trim());

  final String mark = image ? '!' : '';
  final String label = isUrl ? '' : selected;
  final String url = isUrl ? selected.trim() : 'url';
  final String text = '$mark[$label]($url)';
  // Whichever half is the placeholder is what comes out selected, so the next
  // thing typed replaces it.
  final int at = start + mark.length + (isUrl ? 1 : label.length + 3);

  return EditState(
    value.substring(0, start) + text + value.substring(end),
    at,
    isUrl ? at : at + url.length,
  );
}

final RegExp _fenceLine = RegExp(r'^ {0,3}```');

EditState _toggleCodeBlock(EditState state) {
  final List<int> span = _lineRange(state.value, state.start, state.end);
  final int from = span[0];
  final int to = span[1];
  final String block = state.value.substring(from, to);
  final List<String> lines = block.split('\n');
  final bool fenced =
      lines.length > 1 && _fenceLine.hasMatch(lines.first) && _fenceLine.hasMatch(lines.last);
  final String inner = fenced ? lines.sublist(1, lines.length - 1).join('\n') : '```\n$block\n```';

  return EditState(
    state.value.substring(0, from) + inner + state.value.substring(to),
    from,
    from + inner.length,
  );
}

EditState _insertRule(EditState state) {
  final String value = state.value;
  final int start = state.start;
  final int end = state.end;
  final String before = start > 0 && value[start - 1] != '\n' ? '\n\n' : '';
  final String after = end < value.length && value[end] != '\n' ? '\n\n' : '\n';
  final String text = '$before---$after';

  return EditState(
    value.substring(0, start) + text + value.substring(end),
    start + text.length,
    start + text.length,
  );
}

/* -------------------------------------------------------------------------
 * The commands themselves
 * ---------------------------------------------------------------------- */

/// What [command] makes of [state].
EditState runCommand(MawyCommand command, EditState state) {
  return switch (command) {
    MawyCommand.bold => _toggleWrap(state, '**'),
    MawyCommand.italic => _toggleWrap(state, '_'),
    MawyCommand.strikethrough => _toggleWrap(state, '~~'),
    MawyCommand.code => _toggleWrap(state, '`'),
    MawyCommand.link => _insertLink(state, image: false),
    MawyCommand.image => _insertLink(state, image: true),
    MawyCommand.heading1 => _toggleHeading(state, 1),
    MawyCommand.heading2 => _toggleHeading(state, 2),
    MawyCommand.heading3 => _toggleHeading(state, 3),
    MawyCommand.paragraph => _toggleHeading(state, 0),
    MawyCommand.quote => _togglePrefix(state, _quote, '> ', blanks: true),
    MawyCommand.bulletList => _togglePrefix(state, _bulletList, '- ', blanks: false),
    MawyCommand.taskList => _togglePrefix(state, _taskList, '- [ ] ', blanks: false),
    MawyCommand.orderedList => _toggleOrdered(state),
    MawyCommand.codeBlock => _toggleCodeBlock(state),
    MawyCommand.rule => _insertRule(state),
  };
}

/// Whether the selection is already what the command would make it.
///
/// This is what lets a toolbar button be drawn as pressed, and it matters more
/// than it looks: a toggle that never shows its state is a button you have to
/// press to find out what it does.
bool commandActive(MawyCommand command, EditState state) {
  bool wrapped(String marker) {
    final String selected = state.value.substring(state.start, state.end);
    final int width = marker.length;

    return (selected.length >= width * 2 &&
            selected.startsWith(marker) &&
            selected.endsWith(marker)) ||
        (_slice(state.value, state.start - width, state.start) == marker &&
            _slice(state.value, state.end, state.end + width) == marker);
  }

  bool everyLine(RegExp pattern) {
    final List<int> span = _lineRange(state.value, state.start, state.end);
    final List<String> lines = state.value
        .substring(span[0], span[1])
        .split('\n')
        .where((String line) => line.trim().isNotEmpty)
        .toList();

    return lines.isNotEmpty && lines.every((String line) => pattern.hasMatch(line));
  }

  return switch (command) {
    MawyCommand.bold => wrapped('**'),
    MawyCommand.italic => wrapped('_'),
    MawyCommand.strikethrough => wrapped('~~'),
    MawyCommand.code => wrapped('`'),
    MawyCommand.heading1 => everyLine(RegExp(r'^[ \t]*# ')),
    MawyCommand.heading2 => everyLine(RegExp(r'^[ \t]*## ')),
    MawyCommand.heading3 => everyLine(RegExp(r'^[ \t]*### ')),
    MawyCommand.quote => everyLine(_markers[_quote]!),
    MawyCommand.bulletList => everyLine(_markers[_bulletList]!),
    MawyCommand.orderedList => everyLine(_markers[_orderedList]!),
    MawyCommand.taskList => everyLine(_markers[_taskList]!),
    _ => false,
  };
}

/* -------------------------------------------------------------------------
 * Enter, inside a list
 * ---------------------------------------------------------------------- */

/// A line that carries a marker down when `Enter` is pressed on it.
///
/// The `:` is a definition's, and it is on this list rather than beside it
/// because it behaves identically: the next line takes the same marker, and an
/// item still empty gives it up. `:` needs the space after it to be one at all,
/// which is what keeps `:warning:` from being a definition of the line above.
final RegExp _item = RegExp(r'^([ \t]*)([-*+]|:|(\d{1,9})[.)])([ \t]+)(\[[ xX]\][ \t]+)?(.*)$');

/// What Enter should do, when the line it was pressed on is a list item.
///
/// Two behaviours, and the second is the one that makes the first bearable: a
/// new item carries the marker down, and pressing Enter on an item that is
/// still empty takes the marker away instead of making another empty one.
/// Without that, leaving a list means deleting the bullet the editor just
/// helpfully added.
///
/// `null` when the line is not a list item at all, and Enter is just Enter.
///
/// [definitionLists] is the parser's own option, and it is here because the `:`
/// on the list above is only a marker where the parser reads one. An editor
/// told not to read definition lists would otherwise carry a marker down a line
/// the document it is editing does not think is a definition at all.
EditState? continueList(EditState state, {bool definitionLists = true}) {
  if (state.start != state.end) {
    return null;
  }

  final int from = state.start <= 0 ? 0 : state.value.lastIndexOf('\n', state.start - 1) + 1;
  final String line = state.value.substring(from, state.start);
  final RegExpMatch? item = _item.firstMatch(line);

  if (item == null) {
    return null;
  }

  final String indent = item.group(1)!;
  final String marker = item.group(2)!;
  final String? ordinal = item.group(3);
  final String space = item.group(4)!;
  final String? task = item.group(5);
  final String content = item.group(6)!;

  if (marker == ':' && !definitionLists) {
    return null;
  }

  if (content.trim().isEmpty) {
    // An empty item: the marker goes, and so does the list.
    return EditState(
      state.value.substring(0, from) + state.value.substring(state.start),
      from,
      from,
    );
  }

  final String next = ordinal != null
      ? '$indent${int.parse(ordinal) + 1}${marker.substring(ordinal.length)}$space'
      : '$indent$marker$space';
  // A checked box does not carry its tick down to the next line.
  final String text = '\n$next${task != null ? '[ ] ' : ''}';

  return EditState(
    state.value.substring(0, state.start) + text + state.value.substring(state.start),
    state.start + text.length,
    state.start + text.length,
  );
}

/* -------------------------------------------------------------------------
 * Indentation
 * ---------------------------------------------------------------------- */

/// Two spaces, which is what a nested list item needs and not one more.
///
/// Markdown counts columns rather than characters, and a nested item has to be
/// indented past its parent's marker: under `- ` that is two, and two is what
/// every Markdown document already written is indented by. Four would be an
/// indented code block the moment the list above it ends, which is the failure
/// this width exists to avoid.
const String _indentWidth = '  ';

/// How much of a line's indentation to take off, in the width above.
int _outdentOf(String line) {
  final String indent = _indentOf(line);

  if (indent.startsWith('\t')) {
    return 1;
  }

  return indent.length < _indentWidth.length ? indent.length : _indentWidth.length;
}

/// `Tab` and `Shift`+`Tab`, over whatever the selection touches.
///
/// A caret with nothing selected puts the indentation in where it is, the way
/// typing two spaces would, so `Tab` in the middle of a word is two spaces in
/// the middle of a word — that is what was pressed. Anything *selected* moves
/// the lines it touches instead of being replaced by two spaces: a `Tab` that
/// eats the paragraph somebody had selected is the behaviour every editor gave
/// up. The same lines stay selected, so it can be pressed again.
///
/// Outdenting takes a tab or up to two spaces off the front of each line, and a
/// line with no indentation left is not an error — the rest of the block still
/// moves.
EditState indent(EditState state, {required bool out}) {
  final bool spans = state.value.substring(state.start, state.end).contains('\n');

  if (!out && !spans && state.start == state.end) {
    return EditState(
      state.value.substring(0, state.start) + _indentWidth + state.value.substring(state.end),
      state.start + _indentWidth.length,
      state.start + _indentWidth.length,
    );
  }

  return _mapLines(
    state,
    (List<String> lines) => lines
        .map((String line) => out ? line.substring(_outdentOf(line)) : _indentWidth + line)
        .toList(),
  );
}
