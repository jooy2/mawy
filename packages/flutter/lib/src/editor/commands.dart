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

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/parse.dart';

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
  // `lastIndexOf` from before the beginning is an error here, and in JavaScript
  // it looks at the first character instead, so both halves ask only from inside.
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
  final String before = state.value.substring(from, to);
  final String block = rewrite(before.split('\n')).join('\n');
  final String value = state.value.substring(0, from) + block + state.value.substring(to);

  // A caret, or a selection inside one line, is somewhere in the words rather
  // than around a block, and stays there: moved along by whatever the marker in
  // front of the words became. A caret selected into the whole line was typed
  // over by the next letter. A whole line selected stays selected, so the next
  // command acts on it too.
  if (!before.contains('\n') && !(state.start == from && state.end == to && from != to)) {
    return EditState(
      value,
      from + _shifted(before, block, state.start - from),
      from + _shifted(before, block, state.end - from),
    );
  }

  return EditState(value, from, from + block.length);
}

/// Where a place in a line is once only the front of the line has changed.
///
/// What the commands rewrite is a marker, and what comes after it is left as it
/// was, so the words the two lines end with are the same words. A place in them
/// moves by however much longer the front became; a place in the old marker is
/// at the end of the new one.
int _shifted(String was, String now, int at) {
  int same = 0;

  while (same < was.length &&
      same < now.length &&
      was[was.length - 1 - same] == now[now.length - 1 - same]) {
    same += 1;
  }

  final int old = was.length - same;
  final int fresh = now.length - same;

  return at <= old ? fresh : at + fresh - old;
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
        // A line of its own is where the caret is, and a marker is what was
        // asked for there — the empty item or quotation the next words go in.
        // Among other lines it is the marker without the space after it, there
        // being nothing for the space to be in front of.
        return lines.length == 1
            ? _indentOf(line) + prefix
            : blanks
            ? _indentOf(line) + prefix.trimRight()
            : line;
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

      // Blank lines inside the block keep their place and do not take a number,
      // and a blank line on its own is the first item, still to be written.
      if (line.trim().isEmpty) {
        return lines.length == 1 ? '${_indentOf(line)}1. ' : line;
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
/// A heading of [depth] over every line the selection touches, or off it, for
/// any of the six. [runCommand] reaches the first three and body text through
/// this; an editor told to offer other levels calls it directly.
EditState toggleHeading(EditState state, int depth) {
  final String hashes = '#' * depth;
  final RegExp already = RegExp('^[ \\t]*$hashes ');

  return _mapLines(state, (List<String> lines) {
    final List<String> content = lines.where((String line) => line.trim().isNotEmpty).toList();
    final bool on = content.isNotEmpty && content.every((String line) => already.hasMatch(line));

    return lines.map((String line) {
      if (on || depth == 0) {
        return _bare(line);
      }

      return line.trim().isNotEmpty
          ? '${_indentOf(line)}$hashes ${_bare(line).trimLeft()}'
          : lines.length == 1
          ? '${_indentOf(line)}$hashes '
          : line;
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

/// A fence put around the lines the selection touches, or taken off the fenced
/// block the caret is in.
///
/// Off from anywhere inside the block, rather than only from a selection that
/// holds both fences: a caret inside a code block asking for a code block is
/// asking for it to stop being one, and wrapping the line it is on in fences of
/// its own writes a second block into the middle of the first.
///
/// A caret stays among the characters it was among, inside the fences on the
/// way in and out of them on the way back.
EditState _toggleCodeBlock(EditState state) {
  final String value = state.value;
  final int start = state.start;
  final int end = state.end;
  final MdCode? code = _fencedAt(value, start);

  if (code != null && start == end) {
    final int opening = code.content.start - code.range.start;
    final String inner = value
        .substring(code.content.start, code.content.end)
        .replaceFirst(RegExp(r'\n$'), '');
    final int least = code.range.start;
    final int most = code.range.start + inner.length;
    final int at = (start - opening).clamp(least, most);

    return EditState(
      value.substring(0, code.range.start) + inner + value.substring(code.range.end),
      at,
      at,
    );
  }

  final List<int> span = _lineRange(value, start, end);
  final int from = span[0];
  final int to = span[1];
  final String block = value.substring(from, to);
  final List<String> lines = block.split('\n');
  final bool fenced =
      lines.length > 1 && _fenceLine.hasMatch(lines.first) && _fenceLine.hasMatch(lines.last);
  final String inner = fenced ? lines.sublist(1, lines.length - 1).join('\n') : '```\n$block\n```';

  if (start == end) {
    return EditState(value.substring(0, from) + inner + value.substring(to), start + 4, start + 4);
  }

  return EditState(
    value.substring(0, from) + inner + value.substring(to),
    from,
    from + inner.length,
  );
}

/// The fenced code block a place is inside, between its fences, or `null`.
///
/// On the fence lines themselves as well, since the opening fence is what a
/// caret put at the start of the block sits on. Not an indented block, which
/// has no fence to take off, and not a document with no fence in it at all,
/// which is the common case and is answered without a parse.
MdCode? _fencedAt(String value, int offset) {
  if (!value.contains('```') && !value.contains('~~~')) {
    return null;
  }

  final MdDocument document = parseMarkdown(value);

  return _codeNodeAt(<MdNode>[...document.root.children, ...document.footnotes], offset);
}

MdCode? _codeNodeAt(List<MdNode> nodes, int offset) {
  for (final MdNode node in nodes) {
    if (offset < node.range.start || offset > node.range.end) {
      continue;
    }

    if (node is MdCode) {
      return node.content.start > node.range.start ? node : null;
    }

    final MdCode? inside = _codeNodeAt(_blocksIn(node), offset);

    if (inside != null) {
      return inside;
    }
  }

  return null;
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
    MawyCommand.heading1 => toggleHeading(state, 1),
    MawyCommand.heading2 => toggleHeading(state, 2),
    MawyCommand.heading3 => toggleHeading(state, 3),
    MawyCommand.paragraph => toggleHeading(state, 0),
    MawyCommand.quote => _togglePrefix(state, _quote, '> ', blanks: true),
    MawyCommand.bulletList => _togglePrefix(state, _bulletList, '- ', blanks: false),
    MawyCommand.taskList => _togglePrefix(state, _taskList, '- [ ] ', blanks: false),
    MawyCommand.orderedList => _toggleOrdered(state),
    MawyCommand.codeBlock => _toggleCodeBlock(state),
    MawyCommand.rule => _insertRule(state),
  };
}

/// Whether every line the selection touches that has anything on it matches.
///
/// A line at a time, stopping at the first one that does not — rather than
/// cutting the whole selection into lines and then asking about them. The
/// answer is usually no on the first line, and cutting it up first is the work
/// of the whole selection either way.
bool _everyLineIs(EditState state, RegExp pattern) {
  final List<int> span = _lineRange(state.value, state.start, state.end);
  int at = span[0];
  bool any = false;

  while (at < span[1]) {
    final int newline = state.value.indexOf('\n', at);
    final int end = newline == -1 || newline > span[1] ? span[1] : newline;
    final String line = state.value.substring(at, end);

    if (line.trim().isNotEmpty) {
      if (!pattern.hasMatch(line)) {
        return false;
      }

      any = true;
    }

    at = end + 1;
  }

  return any;
}

/// Whether the selection is already a heading of [depth], for any of the six.
///
/// [commandActive] answers for the three the default menu offers; an editor
/// told to offer others asks this instead. [toggleHeading] is the command for
/// all six.
bool headingActive(EditState state, int depth) =>
    _everyLineIs(state, RegExp('^[ \\t]*${'#' * depth} '));

/// Whether the selection is already what the command would make it.
///
/// This is what lets a toolbar button be drawn as pressed, and it matters more
/// than it looks: a toggle that never shows its state is a button you have to
/// press to find out what it does.
bool commandActive(MawyCommand command, EditState state) {
  // Read at the edges of the selection rather than by copying what is between
  // them. A selection can be the whole document, and this runs once for every
  // button on the toolbar every time the caret moves.
  bool wrapped(String marker) {
    final int width = marker.length;

    return (state.end - state.start >= width * 2 &&
            state.value.startsWith(marker, state.start) &&
            state.value.startsWith(marker, state.end - width)) ||
        (_slice(state.value, state.start - width, state.start) == marker &&
            _slice(state.value, state.end, state.end + width) == marker);
  }

  bool everyLine(RegExp pattern) => _everyLineIs(state, pattern);

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
    MawyCommand.codeBlock =>
      state.start == state.end && _fencedAt(state.value, state.start) != null,
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
  final RegExpMatch? own = _item.firstMatch(line);
  final RegExpMatch? item = own ?? _ownerOf(state.value, from, state.start)?.item;

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

  if (own != null && content.trim().isEmpty) {
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

/// A line that might open a list item, somewhere in a document.
final RegExp _anyItem = RegExp(r'^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]', multiLine: true);

/// The first line of the list item a line of words carries on, read the way
/// [_item] reads a line that opens one, or `null`.
///
/// An item's words can run over more than one line — a hard break, a line
/// wrapped by hand — and the second of those opens with no marker at all.
/// `Enter` at its end made a paragraph under the list rather than the next
/// item. The parser says which item the line is in, so the marker is read off
/// that item's first line.
///
/// A blank line carries nothing on, and neither does code inside the item.
/// Only asked where a document has a line that could open a list somewhere in
/// it, which is what spares the parse everywhere else.
({int first, RegExpMatch item})? _ownerOf(String value, int from, int at) {
  if (value.substring(from, at).trim().isEmpty || !_anyItem.hasMatch(value)) {
    return null;
  }

  final MdDocument document = parseMarkdown(value);
  final List<MdNode> blocks = <MdNode>[...document.root.children, ...document.footnotes];
  final MdListItem? owner = _verbatimAt(blocks, at) ? null : _itemNodeAt(blocks, at);

  if (owner == null) {
    return null;
  }

  final int first = owner.range.start <= 0 ? 0 : value.lastIndexOf('\n', owner.range.start - 1) + 1;
  final int end = value.indexOf('\n', first);
  final RegExpMatch? item = first == from
      ? null
      : _item.firstMatch(value.substring(first, end == -1 ? value.length : end));

  return item == null ? null : (first: first, item: item);
}

/// The innermost list item a place is inside.
MdListItem? _itemNodeAt(List<MdNode> nodes, int offset) {
  for (final MdNode node in nodes) {
    if (offset < node.range.start || offset > node.range.end) {
      continue;
    }

    final MdListItem? inside = _itemNodeAt(_blocksIn(node), offset);

    if (inside != null) {
      return inside;
    }

    if (node is MdListItem) {
      return node;
    }
  }

  return null;
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
  final EditState? nested = _nest(state, out: out);

  if (nested != null) {
    return nested;
  }

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

/// A line that opens a list item, cut into the parts [_nest] moves and counts.
final RegExp _itemLine = RegExp(r'^( *)(?:[-*+]|(\d{1,9})([.)]))[ \t]+');

final RegExp _leadingSpaces = RegExp(r'^ *');

/// How many spaces a line opens with.
int _spacesOf(String text) => _leadingSpaces.firstMatch(text)!.group(0)!.length;

/// `Tab` on a list item, which makes it an item of the one above it, and
/// `Shift`+`Tab`, which makes it that one's sibling again — or `null` where the
/// caret is not on an item, and the plain rules below apply.
///
/// Two spaces is the width of a bullet and not of a number: `1. ` is three
/// columns, and an item indented two under it is still an item of the outer
/// list. So an item goes in to where the words of the item above it start, and
/// back out to where the item it is in starts. Whatever the item holds goes
/// with it — the lines it runs on over and the items nested in it.
///
/// A number is counted rather than kept: an item that becomes the first of a
/// list inside another is `1.`, one that joins a list already there is the next
/// number of it, and one that comes back out is the number after the item it
/// was in.
///
/// The first item of a list has no item above it to go into, and `Tab` there
/// does nothing, rather than writing two spaces into the words. An item
/// indented by a tab is left to the plain rules.
EditState? _nest(EditState state, {required bool out}) {
  final String value = state.value;
  final int start = state.start;
  final int end = state.end;

  if (value.substring(start, end).contains('\n')) {
    return null;
  }

  final List<({int start, String text})> lines = <({int start, String text})>[];
  int cursor = 0;

  for (final String text in value.split('\n')) {
    lines.add((start: cursor, text: text));
    cursor += text.length + 1;
  }

  int at = 0;

  while (at < lines.length - 1 && lines[at + 1].start <= start) {
    at += 1;
  }

  RegExpMatch? item = _itemLine.firstMatch(lines[at].text);

  // A line the item runs on over is that item's, for `Tab` as for `Enter`.
  if (item == null) {
    final ({int first, RegExpMatch item})? owner = _ownerOf(value, lines[at].start, start);

    at = owner == null ? -1 : lines.indexWhere((line) => line.start == owner.first);
    item = at == -1 ? null : _itemLine.firstMatch(lines[at].text);

    if (item == null) {
      return null;
    }
  }

  if (RegExp(r'^[ \t]*\t').hasMatch(lines[at].text)) {
    return null;
  }

  final int own = item.group(1)!.length;
  int last = at;

  // What the item holds: the lines under it indented past it, and the blank
  // lines between those.
  for (int index = at + 1; index < lines.length; index += 1) {
    final String text = lines[index].text;

    if (text.trim().isEmpty) {
      continue;
    }

    if (_spacesOf(text) <= own) {
      break;
    }

    last = index;
  }

  int target = -1;
  int? number;

  if (!out) {
    /// The last number of each list the item above holds, by how far in it is.
    final Map<int, int?> counted = <int, int?>{};

    for (int index = at - 1; index >= 0; index -= 1) {
      final String text = lines[index].text;

      if (text.trim().isEmpty) {
        continue;
      }

      final int spaces = _spacesOf(text);
      final RegExpMatch? above = _itemLine.firstMatch(text);

      if (spaces > own) {
        // Met from below, so the first item at a depth is the last of its list.
        if (above != null && !counted.containsKey(spaces)) {
          counted[spaces] = above.group(2) == null ? null : int.parse(above.group(2)!);
        }

        continue;
      }

      if (spaces < own || above == null) {
        return state;
      }

      target = above.group(0)!.length;
      break;
    }

    if (target == -1) {
      return state;
    }

    final int? before = counted[target];

    number = item.group(2) == null ? null : (before == null ? 1 : before + 1);
  } else {
    for (int index = at - 1; index >= 0; index -= 1) {
      final String text = lines[index].text;

      if (text.trim().isEmpty) {
        continue;
      }

      final int spaces = _spacesOf(text);

      if (spaces >= own) {
        continue;
      }

      final RegExpMatch? above = _itemLine.firstMatch(text);

      if (above == null || above.group(0)!.length > own) {
        return null;
      }

      target = spaces;
      number = item.group(2) == null
          ? null
          : above.group(2) != null
          ? int.parse(above.group(2)!) + 1
          : int.parse(item.group(2)!);
      break;
    }

    // An item of the outermost list has nowhere further out to go, and its
    // indentation, and that of the lines it runs on over, is the item's own.
    if (target == -1) {
      return state;
    }
  }

  final int shift = target - own;
  final List<({int start, String was, String text})> moved =
      <({int start, String was, String text})>[
        for (int index = at; index <= last; index += 1)
          (
            start: lines[index].start,
            was: lines[index].text,
            text: _moved(lines[index].text, shift, index == at ? number : null),
          ),
      ];
  final int from = lines[at].start;
  final int to = lines[last].start + lines[last].text.length;
  final String block = moved.map((line) => line.text).join('\n');

  int carry(int offset) {
    int before = from;

    for (final ({int start, String was, String text}) line in moved) {
      if (offset <= line.start + line.was.length) {
        final int into = offset - line.start;

        return before + _shifted(line.was, line.text, into < 0 ? 0 : into);
      }

      before += line.text.length + 1;
    }

    return offset + block.length - (to - from);
  }

  return EditState(
    value.substring(0, from) + block + value.substring(to),
    carry(start),
    carry(end),
  );
}

/// One line of an item [_nest] is moving, moved, and its number counted.
String _moved(String text, int shift, int? number) {
  final int spaces = _spacesOf(text);
  String out = shift > 0 ? ' ' * shift + text : text.substring(-shift < spaces ? -shift : spaces);

  if (number != null) {
    out = out.replaceFirst(RegExp(r'\d{1,9}(?=[.)])'), '$number');
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Tables
 * ---------------------------------------------------------------------- */

/// What can be done to a table's shape.
///
/// Its own list rather than more of [MawyCommand], because none of these is a
/// toggle and none of them always applies: a row cannot go above the header,
/// and the last column cannot be taken away. So each answers `null` where it
/// has nothing to do. Not exported, and not an addition to [MawyCommand]: a
/// value added to an exported enum is a `switch` somewhere else that no longer
/// compiles, and the Flutter editor has no table controls to hand these to
/// yet. They are here so that `tool/parity.dart` holds both packages to one
/// answer.
enum MawyTableCommand {
  /// A table of two columns, a header and one row.
  insertTable,

  /// A row under the caret's.
  addRowBelow,

  /// A row over the caret's, which is never over the header.
  addRowAbove,

  /// A column after the caret's.
  addColumnAfter,

  /// A column before the caret's.
  addColumnBefore,

  /// The caret's row, which is never the header.
  removeRow,

  /// The caret's column, which is never the last one.
  removeColumn,
}

/// One cell's run, between the pipes and not including them.
class _TableCell {
  const _TableCell(this.from, this.to);

  final int from;
  final int to;
}

/// One line of a table, and where each of its cells is written.
class _TableLine {
  const _TableLine({
    required this.start,
    required this.end,
    required this.lineStart,
    required this.cells,
    required this.opened,
    required this.closed,
  });

  /// Where the row's own characters start, after whatever holds the table.
  final int start;
  final int end;

  /// Where the line itself starts, which is before a quotation's `>`.
  final int lineStart;
  final List<_TableCell> cells;

  /// Whether the row opens with a pipe of its own.
  final bool opened;

  /// Whether it closes with one.
  final bool closed;
}

class _TableAt {
  const _TableAt({
    required this.lines,
    required this.row,
    required this.column,
    required this.columns,
    required this.prefix,
  });

  /// The header, the delimiter row, and the body, in that order.
  final List<_TableLine> lines;

  /// Which line the caret is on, with the delimiter row counted as the header.
  final int row;

  /// Which cell it is in.
  final int column;
  final int columns;

  /// What a line of this table has to start with to still be in it.
  final String prefix;
}

final RegExp _closingPipe = RegExp(r'(?:^|[^\\])\|$');
final RegExp _quoted = RegExp(r'^(?:[ \t]*>)*');

int _lineStartOf(String value, int offset) =>
    offset <= 0 ? 0 : value.lastIndexOf('\n', offset - 1) + 1;

/// A row, cut at its unescaped pipes the way the parser cuts it.
///
/// `_splitRow` in `block.dart` is the rule, and this is it again with the
/// offsets kept rather than the text. It has to agree exactly: a pipe this
/// counted and the parser did not is a cell written into the middle of another
/// one.
_TableLine _tableLine(String value, int start, int end) {
  final String text = value.substring(start, end);
  int from = start + (text.length - text.trimLeft().length);
  int stop = end - (text.length - text.trimRight().length);
  final bool opened = from < stop && value[from] == '|';

  if (opened) {
    from += 1;
  }

  final bool closed = _closingPipe.hasMatch(value.substring(from, stop < from ? from : stop));

  if (closed) {
    stop -= 1;
  }

  final List<_TableCell> cells = <_TableCell>[];
  int cell = from;

  for (int at = from; at < stop; at += 1) {
    if (value[at] == r'\' && at + 1 < stop && value[at + 1] == '|') {
      at += 1;
      continue;
    }

    if (value[at] == '|') {
      cells.add(_TableCell(cell, at));
      cell = at + 1;
    }
  }

  // In order even for a row that trims away to nothing, which a no-break space
  // on its own does: the parser still reads it as a row.
  cells.add(_TableCell(cell, stop < cell ? cell : stop));

  return _TableLine(
    start: start,
    end: end,
    lineStart: _lineStartOf(value, start),
    cells: cells,
    opened: opened,
    closed: closed,
  );
}

/// The blocks a node holds, where it holds any a table could be among.
List<MdNode> _blocksIn(MdNode node) {
  return switch (node) {
    MdRoot() => node.children,
    MdBlockquote() => node.children,
    MdList() => node.children,
    MdListItem() => node.children,
    MdDefinitionList() => node.children,
    MdDefinitionDescription() => node.children,
    MdFootnoteDefinition() => node.children,
    MdContainerDirective() => node.children,
    _ => const <MdNode>[],
  };
}

/// The table a place in the tree is inside, if it is inside one.
MdTable? _tableNodeAt(List<MdNode> nodes, int offset) {
  for (final MdNode node in nodes) {
    if (offset < node.range.start || offset > node.range.end) {
      continue;
    }

    if (node is MdTable) {
      return node;
    }

    final MdTable? inside = _tableNodeAt(_blocksIn(node), offset);

    if (inside != null) {
      return inside;
    }
  }

  return null;
}

/// The table the caret is in, read with the parser, or `null`.
///
/// The parser rather than a look at the lines around the caret, because a line
/// with a pipe in it is a table row only where the parser says so: inside a
/// code block it is code, and the line after a table with no pipe in it at all
/// is one of its rows. What the commands change has to be what is drawn as a
/// table.
_TableAt? _tableAt(String value, int offset) {
  if (!value.contains('|')) {
    return null;
  }

  final MdDocument document = parseMarkdown(value);
  final MdTable? table = _tableNodeAt(<MdNode>[
    ...document.root.children,
    ...document.footnotes,
  ], offset);

  if (table == null) {
    return null;
  }

  final MdTableRow header = table.children.first;
  final int delimiterStart = value.indexOf('\n', header.range.end) + 1;
  final int newline = value.indexOf('\n', delimiterStart);
  final int delimiterEnd = newline == -1 ? value.length : newline;
  final int quoted =
      _quoted.firstMatch(value.substring(delimiterStart, delimiterEnd))?.group(0)?.length ?? 0;
  final List<_TableLine> lines = <_TableLine>[
    _tableLine(value, header.range.start, header.range.end),
    _tableLine(value, delimiterStart + quoted, delimiterEnd),
    for (final MdTableRow row in table.children.skip(1))
      _tableLine(value, row.range.start, row.range.end),
  ];
  final int on = lines.indexWhere(
    (_TableLine line) => line.lineStart <= offset && offset <= line.end,
  );

  if (on == -1) {
    return null;
  }

  final _TableLine delimiter = lines[1];
  final List<_TableCell> cells = lines[on].cells;
  final int column = cells.indexWhere((_TableCell cell) => offset <= cell.to);

  return _TableAt(
    lines: lines,
    row: on == 1 ? 0 : on,
    column: column == -1 ? cells.length - 1 : column,
    columns: table.align.length,
    prefix: value.substring(
      delimiter.lineStart,
      delimiter.cells.first.from - (delimiter.opened ? 1 : 0),
    ),
  );
}

/// Where a caret goes in a cell: after what is written in it, or at the end of
/// an empty one, which is where the parser says an empty cell is and so where
/// the drawn document can put a caret into it.
int _caretInCell(String value, _TableCell cell) {
  int at = cell.to;

  while (at > cell.from && value[at - 1] == ' ') {
    at -= 1;
  }

  return at == cell.from ? cell.to : at;
}

/// The same table read again after a change, and a caret put in one of its
/// cells.
EditState _caretAfter(String value, int anchor, int row, int column) {
  final _TableAt? table = _tableAt(value, anchor);
  final _TableLine? line = table != null && row < table.lines.length ? table.lines[row] : null;
  int at = anchor;

  if (line != null) {
    at = _caretInCell(
      value,
      line.cells[column < line.cells.length ? column : line.cells.length - 1],
    );
  }

  return EditState(value, at, at);
}

/// Every line of the table rewritten, from the last so the offsets hold.
String _rewriteLines(
  String value,
  List<_TableLine> lines,
  String Function(String text, _TableLine line, int index) rewrite,
) {
  String out = value;

  for (int index = lines.length - 1; index >= 0; index -= 1) {
    final _TableLine line = lines[index];
    final String text = value.substring(line.start, line.end);

    out = out.substring(0, line.start) + rewrite(text, line, index) + out.substring(line.end);
  }

  return out;
}

/// A row with nothing in any of its cells, which every new one is.
String _emptyRow(int columns) => '|${'  |' * columns}';

/// A line taken apart into what its containers wrote and what is left.
///
/// `lead` is the prefix as it was typed and `carry` is the prefix the *next*
/// line of the same containers takes: a quotation writes its `>` on every line
/// of itself, and a list item writes its bullet once and indents the rest.
///
/// Read off the characters rather than out of the parser, which is right for
/// the place that asks. It is writing lines into the containers the caret's own
/// line opens with, and what those lines have to start with is what this line
/// started with.
({String lead, String carry, String mark}) _containerOf(String head) {
  String lead = '';
  String carry = '';
  String rest = head;

  for (;;) {
    final String indent = _containerIndent.firstMatch(rest)?.group(0) ?? '';

    rest = rest.substring(indent.length);
    lead += indent;
    carry += indent;

    final String? quote = _containerQuote.firstMatch(rest)?.group(0);

    if (quote != null) {
      rest = rest.substring(quote.length);
      lead += quote;
      carry += quote;
      continue;
    }

    final String? item = _containerItem.firstMatch(rest)?.group(0);

    if (item == null) {
      return (lead: lead, carry: carry, mark: rest);
    }

    rest = rest.substring(item.length);
    lead += item;
    carry += ' ' * item.length;
  }
}

final RegExp _containerIndent = RegExp(r'^[ \t]*');
final RegExp _containerQuote = RegExp(r'^>[ \t]?');
final RegExp _containerItem = RegExp(r'^(?:[-*+]|\d{1,9}[.)])[ \t]+');

/// Whether a place is inside a block whose lines are its own characters: code,
/// or HTML.
///
/// Strictly inside, so the end of a closing fence is after the block and a caret
/// there can still put something under it — except for code nothing closes, a
/// fence with no second fence or an indented block, whose last line is still
/// code. A container is looked inside at its end as well, because that end can
/// be the end of such code.
bool _verbatimAt(List<MdNode> nodes, int offset) {
  for (final MdNode node in nodes) {
    final int start = node.range.start;
    final int end = node.range.end;

    if (offset <= start || offset > end) {
      continue;
    }

    if (node is MdCode || node is MdHtmlBlock) {
      final bool open = node is MdCode && node.content.end == end && node.content.start > start;

      if (offset < end || open) {
        return true;
      }

      continue;
    }

    if (_verbatimAt(_blocksIn(node), offset)) {
      return true;
    }
  }

  return false;
}

/// A table of two columns, a header and one row, where the caret is.
///
/// With a blank line either side of it, because a table has to be a block of
/// its own to be one. Empty rather than filled with column names: whatever
/// words it came with would be in the interface's language and in the document
/// for good.
///
/// Inside a quotation or a list item every line of it, and the blank lines
/// around it, carry that container's prefix, or the first line without one
/// would end the container and the table would land after it. Inside a code
/// block there is nothing to do: a table there is characters, and splitting the
/// block around one would change what the rest of the code is.
EditState? _insertTable(EditState state) {
  final String value = state.value;
  final int start = state.start;
  final int end = state.end;

  if (_tableAt(value, start) != null) {
    return null;
  }

  final MdDocument document = parseMarkdown(value);
  final List<MdNode> blocks = <MdNode>[...document.root.children, ...document.footnotes];

  if (_verbatimAt(blocks, start) || _verbatimAt(blocks, end)) {
    return null;
  }

  final int from = _lineStartOf(value, start);
  final line = _containerOf(value.substring(from, start));
  final String carry = line.carry;
  final String blank = carry.trimRight();
  final int stop = value.indexOf('\n', end);
  final String rest = value.substring(end, stop == -1 ? value.length : stop);
  final String above = from > 0 ? value.substring(_lineStartOf(value, from - 1), from - 1) : '';
  final int next = stop == -1 ? -1 : value.indexOf('\n', stop + 1);
  final String below = stop == -1
      ? ''
      : value.substring(stop + 1, next == -1 ? value.length : next);

  // Words before the caret end their line, and a blank line of the same
  // containers comes between them and the table. With none, the line is the
  // table's own, and needs a blank line above it only where the line above has
  // something on it — and not at all where this line opens a list item, which a
  // table can be the first thing in.
  final String lead = line.mark.trim().isNotEmpty
      ? '\n$blank\n$carry'
      : (from > 0 && line.lead == carry && _containerOf(above).mark.trim().isNotEmpty
            ? '\n$carry'
            : '');
  final String tail = rest.trim().isNotEmpty
      ? '\n$blank\n$carry'
      : (stop != -1 && _containerOf(below).mark.trim().isNotEmpty ? '\n$blank' : '');
  final String text = '$lead${_emptyRow(2)}\n$carry| --- | --- |\n$carry${_emptyRow(2)}$tail';
  final int caret = start + lead.length + 3;

  return EditState(value.substring(0, start) + text + value.substring(end), caret, caret);
}

EditState? _addRow(EditState state, {required bool below}) {
  final _TableAt? table = _tableAt(state.value, state.start);

  if (table == null || (!below && table.row == 0)) {
    return null;
  }

  final String value = state.value;
  // Under the header is under the delimiter row, which belongs to it.
  final _TableLine next = table.lines[table.row == 0 ? 1 : table.row];
  final String text = '${table.prefix}${_emptyRow(table.columns)}';
  final int at = below ? next.end : next.lineStart;
  final String written = below ? '\n$text' : '$text\n';
  final int opens = below ? at + 1 : at;
  final int column = table.column < table.columns - 1 ? table.column : table.columns - 1;
  final int caret = opens + table.prefix.length + 3 + 3 * column;

  return EditState(value.substring(0, at) + written + value.substring(at), caret, caret);
}

EditState? _removeRow(EditState state) {
  final _TableAt? table = _tableAt(state.value, state.start);

  if (table == null || table.row == 0) {
    return null;
  }

  final String value = state.value;
  final _TableLine line = table.lines[table.row];
  final String next = value.substring(0, line.lineStart - 1) + value.substring(line.end);
  // The row that moved up into its place, or the one above where there is none.
  final int row = table.row < table.lines.length - 1 ? table.row : table.row - 1;

  return _caretAfter(next, table.lines.first.start, row == 1 ? 0 : row, table.column);
}

EditState? _addColumn(EditState state, {required bool after}) {
  final _TableAt? table = _tableAt(state.value, state.start);

  if (table == null) {
    return null;
  }

  final int column = table.column;
  final String next = _rewriteLines(state.value, table.lines, (
    String text,
    _TableLine line,
    int index,
  ) {
    // A row shorter than the column is already empty there.
    if (column >= line.cells.length) {
      return text;
    }

    final _TableCell cell = line.cells[column];
    final String content = index == 1 ? '---' : '';
    final bool last = column == line.cells.length - 1;
    // A row with no pipe on the side the cell goes on has to be given one, or
    // an empty cell at either end is read as no cell at all.
    final int at = (after ? cell.to : cell.from) - line.start;
    final String written = after
        ? (!last || line.closed ? '| $content ' : ' | $content |')
        : (column > 0 || line.opened ? ' $content |' : '| $content | ');

    return text.substring(0, at) + written + text.substring(at);
  });

  return _caretAfter(next, table.lines.first.start, table.row, after ? column + 1 : column);
}

EditState? _removeColumn(EditState state) {
  final _TableAt? table = _tableAt(state.value, state.start);

  if (table == null || table.columns < 2) {
    return null;
  }

  final int column = table.column;
  final String next = _rewriteLines(state.value, table.lines, (
    String text,
    _TableLine line,
    int index,
  ) {
    if (column >= line.cells.length) {
      return text;
    }

    final _TableCell cell = line.cells[column];
    final int from = cell.from - line.start;
    final int to = cell.to - line.start;
    final String out;

    if (line.cells.length == 1) {
      // A short row with nothing else in it keeps a pipe, or it would be a
      // blank line and the end of the table.
      out = text.substring(0, from) + (line.opened || line.closed ? ' ' : '|') + text.substring(to);
    } else if (column < line.cells.length - 1 || line.closed) {
      out = text.substring(0, from) + text.substring(to + 1);
    } else {
      out = text.substring(0, from - 1).trimRight() + text.substring(to);
    }

    // A header row with no pipe left in it is not a table's header any more.
    return index == 0 && !out.contains('|') ? '${out.trimRight()} |' : out;
  });

  return _caretAfter(next, table.lines.first.start, table.row, column > 0 ? column - 1 : 0);
}

/// A table command, or `null` where it has nothing to do.
EditState? runTableCommand(MawyTableCommand command, EditState state) {
  return switch (command) {
    MawyTableCommand.insertTable => _insertTable(state),
    MawyTableCommand.addRowBelow => _addRow(state, below: true),
    MawyTableCommand.addRowAbove => _addRow(state, below: false),
    MawyTableCommand.addColumnAfter => _addColumn(state, after: true),
    MawyTableCommand.addColumnBefore => _addColumn(state, after: false),
    MawyTableCommand.removeRow => _removeRow(state),
    MawyTableCommand.removeColumn => _removeColumn(state),
  };
}

/// What `Enter` does in a table, which is what it does in a list.
///
/// A cell holds one line, so there is nowhere in the file for `Enter` to put a
/// second one. What it does instead is the list's rule said about rows: a new
/// row under this one, with the caret in the same column, and on a row that is
/// still empty the row goes and the caret goes to a line of its own after the
/// table, still inside the quotation or the list item the table is in.
///
/// `null` outside a table, and for a selection.
EditState? continueTable(EditState state) {
  final _TableAt? table = state.start == state.end ? _tableAt(state.value, state.start) : null;

  if (table == null) {
    return null;
  }

  final String value = state.value;
  final _TableLine line = table.lines[table.row];
  final bool empty = line.cells.every(
    (_TableCell cell) => value.substring(cell.from, cell.to).trim().isEmpty,
  );

  if (table.row == 0 || !empty) {
    return _addRow(state, below: true);
  }

  final _TableLine last = table.lines.last;
  final int removed = line.end - line.lineStart + 1;
  final int end = identical(line, last) ? line.lineStart - 1 : last.end - removed;
  final String without = value.substring(0, line.lineStart - 1) + value.substring(line.end);
  // A line of its own after the table, and inside whatever holds it: a
  // quotation's blank line is `>`, and a list item's next line is indented.
  final String text = '\n${table.prefix.trimRight()}\n${table.prefix}';
  final int caret = end + text.length;

  return EditState(without.substring(0, end) + text + without.substring(end), caret, caret);
}
