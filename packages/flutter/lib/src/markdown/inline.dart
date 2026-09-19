/// The inline parser: everything inside a paragraph, a heading or a table cell.
///
/// Emphasis is the reason this file is not a handful of regular expressions.
/// `*foo**bar**baz*` and `**foo*bar*baz**` are different documents made of the
/// same characters, and which asterisk pairs with which is decided by what is
/// on either side of every run in the line — so a run cannot be resolved when
/// it is read. The delimiter stack below is CommonMark's own answer to that:
/// read the line once into a list of chunks, remembering which runs *could*
/// open and which *could* close, and only then walk the list pairing them off.
///
/// Links are on the same list for the same reason: `[a [b](c)](d)` needs the
/// inner `]` to consume the inner `[`, which is a fact about the whole line.
///
/// This is the React package's `internal/markdown/inline.ts`, in Dart.
library;

import 'dart:typed_data';

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/directive.dart';
import 'package:mawy/src/markdown/entities.dart';
import 'package:mawy/src/markdown/source.dart';
import 'package:mawy/src/markdown/url.dart';

/// What the inline scanner is told about the document it is reading.
class InlineOptions {
  /// Creates the options for one run of inline parsing.
  const InlineOptions({
    required this.gfm,
    required this.breaks,
    required this.typographer,
    required this.autolinkSchemes,
    required this.quotes,
    required this.definitions,
    required this.footnotes,
  });

  /// GitHub's additions: `~~strikethrough~~` and bare URLs becoming links.
  final bool gfm;

  /// Whether a single newline inside a paragraph is a line break.
  final bool breaks;

  /// Whether quotation marks are turned round, and `--`, `...` and `(c)` drawn
  /// as the marks they stand in for.
  final bool typographer;

  /// Whether a bare address carrying any scheme the link policy trusts becomes
  /// a link, on top of the web addresses GFM reads.
  final bool autolinkSchemes;

  /// The four marks a quotation is drawn with.
  final MawyQuotes quotes;

  /// The document's link reference definitions, already collected.
  final Map<String, MdDefinition> definitions;

  /// The labels of the footnotes the document actually defines.
  ///
  /// A `[^a]` with nothing to point at is the four characters it was written
  /// with — the same answer an unresolved `[a][b]` gets.
  final Set<String> footnotes;
}

/* -------------------------------------------------------------------------
 * The chunk list
 * ---------------------------------------------------------------------- */

class _Delimiter {
  _Delimiter({
    required this.char,
    required this.length,
    required this.original,
    required this.canOpen,
    required this.canClose,
  });

  final String char;

  /// How many of the run are still unused. Reaches zero and the chunk goes.
  int length;

  /// How long the run was when it was read — the "rule of three" needs this.
  final int original;
  final bool canOpen;
  final bool canClose;
}

class _Opener {
  _Opener({required this.image, required this.active, required this.textStart});

  final bool image;

  /// A link may not contain another link. Closing one deactivates every *link*
  /// opener to its left, so `[a [b](c)](d)` gives the inner link and leaves the
  /// outer brackets as text.
  ///
  /// An image opener is left alone, and that is the whole of the difference
  /// between the two: a description may hold a link, and `![a [b](c)](d)` is
  /// one image whose alt text is `a b`.
  bool active;

  /// Where the label's text starts in the source, for a reference lookup.
  final int textStart;
}

class _Chunk {
  _Chunk(this.node, [this.depth = 1]);

  MdInline node;
  _Delimiter? delimiter;
  _Opener? opener;

  /// How deep the tree under [node] goes, counting the node itself as one.
  ///
  /// Carried rather than measured, because measuring it would walk the subtree
  /// that was just built and every node would be walked once per level above
  /// it. See [_nesting].
  int depth;

  /// What this chunk sits between. See [_Chain].
  _Chunk? prev;
  _Chunk? next;
}

/// The chunks of one run of text, in the order they were read.
///
/// A list rather than an array, and that is the one structural decision in this
/// file. What this algorithm does to the chunks is take a span out of the
/// middle and put one node in its place, once for every pair of delimiters and
/// once for every link — and in an array that moves everything after the cut,
/// so a paragraph of `*a*` repeated cost the square of its own length. Reading
/// them back in order is the only other thing anybody does with them, and a
/// list is as good at that as an array is.
class _Chain {
  _Chunk? head;
  _Chunk? tail;
}

class _State {
  final _Chain chunks = _Chain();

  /// The chunks that are delimiter runs, in source order, with a hole where one
  /// has been used up.
  ///
  /// A list, because the pairing walks it by index and remembers positions in
  /// it — `openersBottom` is a note that says "no opener for this kind before
  /// here". So a run that is finished with is replaced by `null` rather than
  /// taken out, which keeps every position anybody is holding and costs
  /// nothing: removing from the middle moved the rest, once per pair.
  final List<_Chunk?> delimiters = <_Chunk?>[];

  /// The `[` and `![` chunks that have not been closed, innermost last.
  final List<_Chunk> openers = <_Chunk>[];
}

/// How deep emphasis, strong, strikethrough and links may nest inside one
/// paragraph before the delimiters left over are drawn as characters.
///
/// The block parser has the same limit for the same reason, written up under
/// its own `nesting` in `block.dart`: reading a document is a stack of calls as
/// deep as the document is nested, and so is every walk of the tree afterwards.
/// `*` written sixteen thousand times is a paragraph eight thousand levels
/// deep, and it ran the stack out — in the renderer, in the merge pass, in an
/// application's own walk of the tree — at a different depth in each of the two
/// languages this parser is written in.
///
/// A hundred is past anything a person writes. Past it, pairing simply stops
/// for the rest of the paragraph and what is left of the run is the characters
/// it was written with, which is what an unmatched delimiter is anyway.
const int _nesting = 100;

_Chunk _textChunk(String value, MdRange range) => _Chunk(MdText(range, value));

/// Onto the end of the chain, which is where reading puts every chunk.
_Chunk _append(_Chain chain, _Chunk chunk) {
  chunk.prev = chain.tail;
  chunk.next = null;

  if (chain.tail == null) {
    chain.head = chunk;
  } else {
    chain.tail!.next = chunk;
  }

  chain.tail = chunk;

  return chunk;
}

/// Out of the chain, leaving what was on either side of it beside each other.
void _unlink(_Chain chain, _Chunk chunk) {
  if (chunk.prev == null) {
    chain.head = chunk.next;
  } else {
    chunk.prev!.next = chunk.next;
  }

  if (chunk.next == null) {
    chain.tail = chunk.prev;
  } else {
    chunk.next!.prev = chunk.prev;
  }

  chunk.prev = null;
  chunk.next = null;
}

/// Everything from [chunk] to the end of the chain goes, and [chunk] with it.
void _cut(_Chain chain, _Chunk chunk) {
  chain.tail = chunk.prev;

  if (chunk.prev == null) {
    chain.head = null;
  } else {
    chunk.prev!.next = null;
  }
}

/// The nodes strictly between two chunks, and how deep the deepest of them
/// goes.
///
/// A [to] of `null` means the end of the chain, which is what a link's label
/// is: everything written after the `[` that opened it.
({List<MdInline> children, int depth}) _between(_Chunk from, _Chunk? to) {
  final List<MdInline> children = <MdInline>[];
  int depth = 0;

  for (_Chunk? at = from.next; at != null && !identical(at, to); at = at.next) {
    children.add(at.node);

    if (at.depth > depth) {
      depth = at.depth;
    }
  }

  return (children: children, depth: depth);
}

/// One chunk in place of everything between these two.
void _fold(_Chunk opener, _Chunk made, _Chunk closer) {
  opener.next = made;
  made.prev = opener;
  made.next = closer;
  closer.prev = made;
}

/* -------------------------------------------------------------------------
 * Character classes
 * ---------------------------------------------------------------------- */

final RegExp _punctuation = RegExp(r'[\p{P}\p{S}]', unicode: true);
final RegExp _whitespace = RegExp(r'\s');

/// The five characters the specification calls whitespace, by code.
///
/// Not `\s`, which is every Unicode space there is — and a no-break space is
/// one of those and is not one of these. `[link](/url "title")` has a
/// destination of `/url "title"` and no title at all, because nothing
/// separated the two.
///
/// The flanking rules above *do* want `\s`: those are written in terms of
/// Unicode whitespace rather than these five, which is why both are here.
///
/// A code rather than a pattern, because the caller that matters reads a
/// destination one character at a time and reads it again from every `]` after
/// it, which is the length of a paragraph squared on a document written to
/// make it. A regular expression for one character, and in Dart the
/// one-character string to hand it, was most of what that cost.
bool _isAsciiWhitespaceCode(int code) =>
    code == 0x20 || code == 0x09 || code == 0x0a || code == 0x0c || code == 0x0d;

/// ASCII punctuation, which is the whole of what a backslash may escape.
///
/// The four ranges are `!` to `/`, `:` to `@`, `[` to a backtick, and `{` to
/// `~`, which is every printable ASCII character that is neither a letter nor
/// a digit.
bool _isEscapableCode(int code) =>
    (code >= 0x21 && code <= 0x2f) ||
    (code >= 0x3a && code <= 0x40) ||
    (code >= 0x5b && code <= 0x60) ||
    (code >= 0x7b && code <= 0x7e);

/// The code at [index], or `-1` where there is no character there.
int _codeAt(String source, int index) =>
    index >= 0 && index < source.length ? source.codeUnitAt(index) : -1;

/// Whether a delimiter run has content on its left, on its right, or both.
///
/// This is the whole of CommonMark's emphasis rule and it is easy to get subtly
/// wrong: a run is *left-flanking* when it is not followed by whitespace and
/// either is not followed by punctuation or is itself preceded by whitespace or
/// punctuation. Which is a long way of saying: the run is up against a word on
/// its right.
List<bool> _flanking(String source, int start, int end) {
  final String before = start > 0 ? source[start - 1] : ' ';
  final String after = end < source.length ? source[end] : ' ';

  final bool whitespaceBefore = _whitespace.hasMatch(before);
  final bool whitespaceAfter = _whitespace.hasMatch(after);
  final bool punctuationBefore = _punctuation.hasMatch(before);
  final bool punctuationAfter = _punctuation.hasMatch(after);

  final bool left =
      !whitespaceAfter && (!punctuationAfter || whitespaceBefore || punctuationBefore);
  final bool right =
      !whitespaceBefore && (!punctuationBefore || whitespaceAfter || punctuationAfter);

  return <bool>[left, right];
}

/* -------------------------------------------------------------------------
 * Emphasis
 * ---------------------------------------------------------------------- */

/// The "rule of three".
///
/// Without it, `*foo**bar**baz*` pairs the wrong asterisks and the sentence
/// comes out as two nested emphases instead of one containing a strong. The
/// rule is stated in the specification exactly as it is written here, and the
/// reason it looks arbitrary is that it is: it is the smallest patch that makes
/// the common intraword cases come out the way an author expects.
bool _blockedByRuleOfThree(_Delimiter opener, _Delimiter closer) {
  if (!closer.canOpen && !opener.canClose) {
    return false;
  }

  if ((opener.original + closer.original) % 3 != 0) {
    return false;
  }

  return opener.original % 3 != 0 || closer.original % 3 != 0;
}

/// Pair off every delimiter above [bottom] and fold what is between each pair
/// into an emphasis, a strong or a strikethrough.
///
/// Runs that never find a partner stay exactly as they were typed, which is why
/// the delimiter's characters live in a real text node the whole time rather
/// than being held to one side and put back on failure.
void _processEmphasis(_State state, int bottom) {
  final _Chain chunks = state.chunks;
  final List<_Chunk?> delimiters = state.delimiters;
  final Map<String, int> openersBottom = <String, int>{};
  int closerIndex = bottom;

  while (closerIndex < delimiters.length) {
    final _Chunk? closerChunk = delimiters[closerIndex];

    // A hole, where a run that used to be here has been used up.
    if (closerChunk == null) {
      closerIndex += 1;
      continue;
    }

    final _Delimiter closer = closerChunk.delimiter!;

    if (!closer.canClose) {
      closerIndex += 1;
      continue;
    }

    final String key = '${closer.char}:${closer.original % 3}:${closer.canOpen}';
    final int stored = openersBottom[key] ?? bottom;
    final int floor = stored > bottom ? stored : bottom;
    int found = -1;

    for (int at = closerIndex - 1; at >= floor; at -= 1) {
      final _Delimiter? candidate = delimiters[at]?.delimiter;

      if (candidate != null &&
          candidate.canOpen &&
          candidate.char == closer.char &&
          !_blockedByRuleOfThree(candidate, closer)) {
        found = at;
        break;
      }
    }

    if (found == -1) {
      openersBottom[key] = closerIndex;

      // A run that can only close and matched nothing is finished with: it
      // stays on the page as text, but nothing later can pair with it.
      if (!closer.canOpen) {
        delimiters[closerIndex] = null;
      }

      closerIndex += 1;
      continue;
    }

    final _Chunk openerChunk = delimiters[found]!;
    final _Delimiter opener = openerChunk.delimiter!;
    final int use = closer.char == '~' || (opener.length >= 2 && closer.length >= 2) ? 2 : 1;
    final ({List<MdInline> children, int depth}) inside = _between(openerChunk, closerChunk);
    final List<MdInline> children = inside.children;
    final int depth = inside.depth + 1;

    // Too deep to wrap, and every pair still waiting is one level deeper than
    // this one — so nothing more is paired in this paragraph and the runs that
    // are left stay the characters they were written with. See [_nesting].
    if (depth > _nesting) {
      break;
    }

    // The characters that pair off are the *last* of the opening run and the
    // first of the closing one, so the node starts where what is left of the
    // opener ends.
    final MdText openerNode = openerChunk.node as MdText;
    final MdText closerNode = closerChunk.node as MdText;
    final MdRange range = MdRange(openerNode.range.end - use, closerNode.range.start + use);

    final MdInline node = closer.char == '~'
        ? MdDelete(range, children)
        : (use == 2 ? MdStrong(range, children) : MdEmphasis(range, children));

    _fold(openerChunk, _Chunk(node, depth), closerChunk);

    // Everything between the two is inside the node now, so no run in there can
    // pair with anything ever again.
    for (int at = found + 1; at < closerIndex; at += 1) {
      delimiters[at] = null;
    }

    opener.length -= use;
    closer.length -= use;
    openerNode.value = closer.char * opener.length;
    openerNode.range = MdRange(openerNode.range.start, range.start);
    closerNode.value = closer.char * closer.length;
    closerNode.range = MdRange(range.end, closerNode.range.end);

    if (closer.length == 0) {
      _unlink(chunks, closerChunk);
      delimiters[closerIndex] = null;
    }

    if (opener.length == 0) {
      _unlink(chunks, openerChunk);
      delimiters[found] = null;
    }
  }

  delimiters.removeRange(bottom, delimiters.length);
}

/* -------------------------------------------------------------------------
 * Link destinations and labels
 * ---------------------------------------------------------------------- */

class _Destination {
  const _Destination(this.url, this.title, this.end);

  final String url;
  final String? title;
  final int end;
}

String _at(String source, int index) => index >= 0 && index < source.length ? source[index] : '';

/// `(url "title")` — the parenthesised half of an inline link.
/// Where a destination read from each place could first stop, or `-1` for the
/// places a read from which runs off the end of the text.
///
/// A destination that never closes is read to the end, and read again from
/// every `]` written after it, so `[a](` repeated cost the square of its own
/// length — the one shape left after the chunks became a list. This is what
/// lets the second read answer without reading: a run that stops nowhere is
/// refused, always, because the check at the end of the read wants a `)` and
/// there is none.
///
/// Three things stop a read, and the table holds the nearest of them:
///
/// - A space, which is where a bare destination ends.
/// - A `)` the read is not inside a pair of brackets for. Whether it is depends
///   on where the read began, and the running count of brackets is what says
///   so: a read from `s` breaks at the first `)` at `r` where the count is what
///   it was at `s`, because that is what a depth of zero means.
/// - A backslash, which is not a stop at all and is counted as one anyway. What
///   it escapes depends on where the read began — `\\(` is a bracket to a read
///   starting on the second character and an escape to one starting on the
///   first — so one table cannot answer for both, and the answer is to stop
///   claiming to. A run with a backslash in it is read the long way.
///
/// Built once, and only after a read has run off the end and been refused, so a
/// document whose destinations all close pays nothing for it.
Int32List _reachOf(String source) {
  final Int32List stop = Int32List(source.length + 1)..fillRange(0, source.length + 1, -1);
  final Map<int, int> closes = <int, int>{};
  // Counted from the right, so it is the count at `at` rather than up to it.
  // Only ever compared against itself, so where it starts does not matter.
  int brackets = 0;
  int halt = -1;

  for (int at = source.length - 1; at >= 0; at -= 1) {
    final int code = source.codeUnitAt(at);

    if (code == 0x28) {
      brackets -= 1;
    } else if (code == 0x29) {
      brackets += 1;
    }

    if (_isAsciiWhitespaceCode(code) || code == 0x5c) {
      halt = at;
    } else if (code == 0x29) {
      closes[brackets] = at;
    }

    final int close = closes[brackets] ?? -1;

    stop[at] = halt == -1 ? close : (close == -1 ? halt : (halt < close ? halt : close));
  }

  return stop;
}

/// What has been worked out about a run of text, once anything needed it.
class _Reach {
  Int32List? stop;
}

_Destination? _readInlineDestination(String source, int start, _Reach reach) {
  int at = start + 1;

  void skipSpace() {
    while (at < source.length && _isAsciiWhitespaceCode(source.codeUnitAt(at))) {
      at += 1;
    }
  }

  skipSpace();

  // Written into a buffer rather than onto a string. A Dart string is
  // immutable, so `url += character` copies everything read so far on every
  // character, and a destination this loop reads to the end of the document
  // before refusing it cost the square of its own length. A paragraph of
  // `[a](` repeated — which is a destination that never closes, read again
  // from every `]` in it — took eighty-five seconds at thirty-two kilobytes,
  // on the thread that draws.
  final StringBuffer url = StringBuffer();

  if (_at(source, at) == '<') {
    at += 1;

    while (at < source.length && source.codeUnitAt(at) != 0x3e) {
      if (source.codeUnitAt(at) == 0x0a) {
        return null;
      }

      if (source.codeUnitAt(at) == 0x5c && _isEscapableCode(_codeAt(source, at + 1))) {
        at += 1;
      }

      url.writeCharCode(source.codeUnitAt(at));
      at += 1;
    }

    if (_at(source, at) != '>') {
      return null;
    }

    at += 1;
  } else {
    // Already known to read to the end of the text, and a read that does that
    // is refused below whatever it read. See [_reachOf].
    if (reach.stop != null && reach.stop![at] == -1) {
      return null;
    }

    int depth = 0;

    // By code rather than by character: this is the loop a hostile document
    // makes quadratic, and a one-character string plus a regular expression
    // for every character of it is most of what that costs.
    while (at < source.length) {
      final int code = source.codeUnitAt(at);

      if (_isAsciiWhitespaceCode(code)) {
        break;
      }

      if (code == 0x5c && _isEscapableCode(_codeAt(source, at + 1))) {
        url.writeCharCode(source.codeUnitAt(at + 1));
        at += 2;
        continue;
      }

      if (code == 0x28) {
        depth += 1;
      } else if (code == 0x29) {
        if (depth == 0) {
          break;
        }

        depth -= 1;
      }

      url.writeCharCode(code);
      at += 1;
    }

    // Off the end, which is refused below and will be refused every time. The
    // table is what makes the next one cheap, and this is the first moment
    // anybody needs it.
    if (at >= source.length) {
      reach.stop ??= _reachOf(source);
    }
  }

  skipSpace();

  StringBuffer? title;
  final String quote = _at(source, at);

  if (quote == '"' || quote == "'" || quote == '(') {
    final String closing = quote == '(' ? ')' : quote;

    at += 1;
    title = StringBuffer();

    while (at < source.length && source[at] != closing) {
      if (source.codeUnitAt(at) == 0x5c && _isEscapableCode(_codeAt(source, at + 1))) {
        at += 1;
      }

      title.writeCharCode(source.codeUnitAt(at));
      at += 1;
    }

    if (_at(source, at) != closing) {
      return null;
    }

    at += 1;
    skipSpace();
  }

  if (_at(source, at) != ')') {
    return null;
  }

  return _Destination(
    decodeEntities(url.toString()),
    title == null ? null : decodeEntities(title.toString()),
    at + 1,
  );
}

final RegExp _runsOfSpace = RegExp(r'\s+');
final RegExp _anyEscape = RegExp(r'\\.', dotAll: true);

/// A reference label, folded to the form definitions are stored under.
///
/// Case and runs of whitespace do not distinguish two labels, so `[Foo Bar]`
/// and `[foo   bar]` are the same reference. Folding here and at the definition
/// site means the map never has to be searched twice.
///
/// An escape is *not* read here, and that is the specification rather than an
/// oversight: `[foo\!]` and `[foo!]` are two labels. Both sides fold the
/// characters as written, so both sides agree, and what the escape means is
/// settled where the label is drawn rather than where it is looked up.
String normalizeLabel(String label) => label.trim().replaceAll(_runsOfSpace, ' ').toLowerCase();

final RegExp _escaped = RegExp(r'''\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])''');

/// A backslash taken off whatever it was in front of.
///
/// A destination, a title, a reference label and a fence's info string all read
/// their escapes rather than showing them, and each of them is scanned by a
/// regular expression that keeps the characters as written — so this is what
/// turns `/bar\*` into `/bar*` afterwards.
String unescaped(String text) => text.replaceAllMapped(_escaped, (Match m) => m.group(1)!);

class _Reference {
  const _Reference(this.label, this.end);

  final String label;
  final int end;
}

/// `[label]` immediately after a closed `]`, for a full reference link.
_Reference? _readReferenceLabel(String source, int start) {
  if (_at(source, start) != '[') {
    return null;
  }

  int at = start + 1;
  // A buffer, for the reason the text a paragraph holds is one: a label is read
  // a character at a time and a Dart string copies itself on every append.
  final StringBuffer label = StringBuffer();

  while (at < source.length) {
    final String character = source[at];

    if (character == r'\' && _isEscapableCode(_codeAt(source, at + 1))) {
      label.write(source.substring(at, at + 2));
      at += 2;
      continue;
    }

    if (character == '[') {
      return null;
    }

    if (character == ']') {
      return _Reference(label.toString(), at + 1);
    }

    label.write(character);
    at += 1;
  }

  return null;
}

/* -------------------------------------------------------------------------
 * Leaf scanners
 * ---------------------------------------------------------------------- */

class _CodeSpan {
  const _CodeSpan(this.value, this.end);

  final String value;
  final int end;
}

/// A run of backticks, and the matching run that closes it.
_CodeSpan? _readCodeSpan(String source, int start) {
  int fence = 0;

  while (_at(source, start + fence) == '`') {
    fence += 1;
  }

  int at = start + fence;

  while (at < source.length) {
    if (source[at] != '`') {
      at += 1;
      continue;
    }

    int run = 0;

    while (_at(source, at + run) == '`') {
      run += 1;
    }

    if (run == fence) {
      String value = source.substring(start + fence, at).replaceAll('\n', ' ');

      // One space is stripped from each end when there is one at both — that is
      // what lets a code span hold a literal backtick.
      if (value.length > 2 &&
          value.startsWith(' ') &&
          value.endsWith(' ') &&
          value.trim().isNotEmpty) {
        value = value.substring(1, value.length - 1);
      }

      return _CodeSpan(value, at + run);
    }

    at += run;
  }

  return null;
}

final RegExp _autolinkUri = RegExp(r'^<([A-Za-z][A-Za-z\d+.-]{1,31}:[^\s<>]*)>');
final RegExp _autolinkEmail = RegExp(
  r"^<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>",
);
// An attribute name is a letter, `_` or `:` and then letters, digits, `_`,
// `.`, `:` and `-` — which is the specification's own rule, and is narrower
// than "anything that is not a space or a quote": `<a h*#ref="hi">` is a
// sentence about a tag rather than a tag, and so is a second line of one that
// begins `bim!bop`.
//
// `<!-->` and `<!--->` are comments in their own right, so they are tried
// before the general form. Without that, `<!--> foo -->` is one comment as far
// as the closing `-->` rather than a comment and then some text.
final RegExp _inlineHtml = RegExp(
  r'''^(?:<[A-Za-z][A-Za-z\d-]*(?:\s+[A-Za-z_:][A-Za-z\d_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*/?>|</[A-Za-z][A-Za-z\d-]*\s*>|<!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Za-z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)''',
);

/* -------------------------------------------------------------------------
 * Bare URLs
 * ---------------------------------------------------------------------- */

/// A host with a dot in it, which is what tells an address from a word.
///
/// `example.com` and `a.b.co.uk` are addresses and `localhost` is not, which is
/// also what keeps `//server/share` — a path on a Windows network — from being
/// read as an address that left its scheme to the page.
const String _host =
    r'[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)+';

/// An e-mail address, written with no markup around it.
///
/// The local part is held to sixty-four characters, which is the limit RFC 5321
/// puts on it. Without a bound the `+` reads to the end of the paragraph looking
/// for an `@`, gives the last character back, looks again, and does that from
/// every position it could start at — so a run of letters with no space in it,
/// a base64 blob among them, cost the square of its own length.
const String _email = r'[A-Za-z\d._%+-]{1,64}@' + _host;

/// A bare URL or an address, in the three shapes GFM reads.
final RegExp _literal = RegExp(r'(?:https?://|www\.)[^\s<]+|' + _email);

/// The same, widened to every other scheme and to an address that left its
/// scheme to the page.
///
/// Which schemes is not decided here: the run only has to *look* like an
/// address with a scheme on it, and [safeUrl] then refuses every scheme the
/// library will not follow. So this and the allowlist cannot disagree about
/// what `ftp://` is, and a `TODO:x` in a sentence is read, refused and drawn as
/// the words it is.
///
/// The web addresses come first on purpose. `www.example.com:8080/x` has a
/// colon in it and would otherwise be read as a scheme of `www.example.com`,
/// which is no scheme at all, and a host GFM already reads would stop being a
/// link the moment this option was turned on.
final RegExp _wideLiteral = RegExp(
  r'(?:https?://|www\.)[^\s<]+|[A-Za-z][A-Za-z\d+.-]{1,31}:[^\s<]+|//' +
      _host +
      r'[^\s<]*|' +
      _email,
);
final RegExp _scheme = RegExp(r'^[A-Za-z][A-Za-z\d+.-]{1,31}:');
final RegExp _www = RegExp(r'^www\.', caseSensitive: false);
final RegExp _trailingEntity = RegExp(r'&[A-Za-z\d]+;$');

/// Only after whitespace or one of the few marks a URL is written next to.
bool _canStartLiteral(String? before) =>
    before == null || _whitespace.hasMatch(before) || '*_~([{'.contains(before);

/// Trailing punctuation that belongs to the sentence rather than to the URL.
///
/// "See https://example.com." ends in a full stop, and a link that swallowed it
/// would be a link to the wrong page. The closing parenthesis is the awkward
/// one — Wikipedia URLs end in one legitimately — so it is kept only while the
/// parentheses in the match balance.
String _trimLiteral(String match) {
  int end = match.length;

  while (end > 0) {
    final String character = match[end - 1];

    if ('!"\'*,.:;?_~'.contains(character)) {
      end -= 1;
      continue;
    }

    if (character == ')') {
      final String head = match.substring(0, end);
      final int opens = '('.allMatches(head).length;
      final int closes = ')'.allMatches(head).length;

      if (closes > opens) {
        end -= 1;
        continue;
      }
    }

    break;
  }

  // `&copy;` at the end of a URL is a character reference in the prose around
  // it far more often than it is part of the address.
  final String trimmed = match.substring(0, end);
  final RegExpMatch? entity = _trailingEntity.firstMatch(trimmed);

  return entity == null ? trimmed : trimmed.substring(0, entity.start);
}

/// Where a bare address points, or `null` where the link policy will not follow
/// it there.
///
/// Four shapes reach here and each says its destination a different way. A
/// `www.` host is an address missing its scheme, one starting `//` is missing
/// only that and the page supplies it, anything carrying a scheme already says
/// where it goes, and what is left is an e-mail address.
String? _addressUrl(String text) {
  if (_www.hasMatch(text)) {
    return safeUrl('http://$text');
  }

  if (text.startsWith('//') || _scheme.hasMatch(text)) {
    return safeUrl(text);
  }

  return safeUrl('mailto:$text');
}

/// A text node split around the bare URLs and e-mail addresses inside it.
///
/// The pieces get their offsets by counting from the node's own start, which is
/// exact whenever the node is the characters it was written with — and it is,
/// unless a character reference or a backslash escape was decoded on the way
/// in. Nothing is left to say where those went, so the count is held inside the
/// node's range instead: a piece may then be a character or two out, and is
/// still in order and still inside the node it came from.
List<MdInline> _linkifyText(MdText node, RegExp pattern) {
  final String value = node.value;
  int offset(int index) {
    final int at = node.range.start + index;

    return at < node.range.end ? at : node.range.end;
  }

  final List<MdInline> out = <MdInline>[];
  int last = 0;
  int search = 0;

  while (search <= value.length) {
    final RegExpMatch? match = pattern.firstMatch(value.substring(search));

    if (match == null) {
      break;
    }

    final int at = search + match.start;
    final String whole = match.group(0)!;

    search = at + whole.length;

    if (!_canStartLiteral(at == 0 ? null : value[at - 1])) {
      continue;
    }

    final String text = _trimLiteral(whole);

    if (text.isEmpty) {
      continue;
    }

    final String? url = _addressUrl(text);

    if (url == null) {
      continue;
    }

    if (at > last) {
      out.add(MdText(MdRange(offset(last), offset(at)), value.substring(last, at)));
    }

    final MdRange range = MdRange(offset(at), offset(at + text.length));

    out.add(MdLink(range, url: url, title: null, children: <MdInline>[MdText(range, text)]));
    last = at + text.length;
    search = last;
  }

  if (last < value.length) {
    out.add(MdText(MdRange(offset(last), node.range.end), value.substring(last)));
  }

  return out.isNotEmpty ? out : <MdInline>[node];
}

/// The same, over a finished tree — but never inside a link, which has one.
List<MdInline> _linkify(List<MdInline> nodes, RegExp pattern) {
  final List<MdInline> out = <MdInline>[];

  for (final MdInline node in nodes) {
    if (node is MdText) {
      out.addAll(_linkifyText(node, pattern));
      continue;
    }

    if (node is MdEmphasis) {
      out.add(MdEmphasis(node.range, _linkify(node.children, pattern)));
      continue;
    }

    if (node is MdStrong) {
      out.add(MdStrong(node.range, _linkify(node.children, pattern)));
      continue;
    }

    if (node is MdDelete) {
      out.add(MdDelete(node.range, _linkify(node.children, pattern)));
      continue;
    }

    out.add(node);
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Typography
 * ---------------------------------------------------------------------- */

/// The four marks a quotation is drawn with.
///
/// English and Korean write one the same way, so the default covers both
/// languages this library's interface speaks — and the document is not the
/// interface, which is why it is an option at all. German writes „a“ and
/// French «a», and a reader of one of those meets the wrong mark otherwise.
///
/// Every field keeps its default when it is left out, so
/// `MawyQuotes(doubleOpen: '„', doubleClose: '“')` is the whole of what a German
/// document needs.
class MawyQuotes {
  /// Creates a set of quotation marks, taking the English ones for anything
  /// left out.
  const MawyQuotes({
    this.doubleOpen = '“',
    this.doubleClose = '”',
    this.singleOpen = '‘',
    this.singleClose = '’',
  });

  /// What opens a quotation.
  final String doubleOpen;

  /// And what closes it.
  final String doubleClose;

  /// What opens a quotation inside one.
  final String singleOpen;

  /// And what closes that.
  final String singleClose;

  @override
  bool operator ==(Object other) =>
      other is MawyQuotes &&
      other.doubleOpen == doubleOpen &&
      other.doubleClose == doubleClose &&
      other.singleOpen == singleOpen &&
      other.singleClose == singleClose;

  @override
  int get hashCode => Object.hash(doubleOpen, doubleClose, singleOpen, singleClose);
}

/// The apostrophe, which is not one of the four.
///
/// It is the same character as English's closing single quote and is not the
/// same *mark*: `dogs’ bones` wants this whatever a document's quotations are
/// drawn with, and a German document that set its single marks to ‚‘ would
/// otherwise come out as `dogs‘ bones`.
const String _apostrophe = '’';

/// `(c)`, `(tm)` and `(r)`, which are typed for marks a keyboard has no key for.
final RegExp _mark = RegExp(r'\((?:c|tm|r)\)', caseSensitive: false);
final RegExp _marks = RegExp(r'\((c|tm|r)\)', caseSensitive: false);
const Map<String, String> _marked = <String, String>{'c': '©', 'r': '®', 'tm': '™'};

/// Anything the substitutions below could touch.
///
/// A paragraph has none of it far more often than it has some, and the eight
/// passes underneath are eight walks of the string. This is one.
final RegExp _rare = RegExp(r'\+-|\.\.|\?{4}|!{4}|,,|--');

final RegExp _dots = RegExp(r'\.{2,}');
final RegExp _afterMark = RegExp('([?!])…');
final RegExp _manyMarks = RegExp(r'([?!]){4,}');
final RegExp _commas = RegExp(r',{2,}');
final RegExp _emDash = RegExp(r'(^|[^-])---(?=[^-]|$)', multiLine: true);
final RegExp _enDashApart = RegExp(r'(^|\s)--(?=\s|$)', multiLine: true);
final RegExp _enDashTight = RegExp(r'(^|[^-\s])--(?=[^-\s]|$)', multiLine: true);

/// Both quotation marks, which the pairing below reads a run for.
final RegExp _quotes = RegExp('[\'"]');

/// A single digit, for the one rule that asks whether a mark follows a number.
final RegExp _digit = RegExp(r'\d');

/// How many quotation marks may be left open in one run before it is given up
/// on.
///
/// A bound rather than a rule: a paragraph written with a thousand unclosed
/// quotation marks is not prose, and the pairing is what would go on holding
/// all of them. Everything paired before the bound is reached is still drawn
/// paired.
const int _openers = 1000;

/// The substitutions, in the order they have to be made.
///
/// The order is the whole of it. An ellipsis is made before `?...` is put back
/// as `?..`, so that the three dots are one character by the time the question
/// mark is looked at; and three hyphens are taken before two, so that `---` is
/// an em dash rather than an en dash with a hyphen left over.
///
/// The list is markdown-it's, character for character, and that is deliberate:
/// these are conventions rather than decisions, and a document written against
/// the reader most of the internet uses has to come out of this one the same
/// way. `..` becoming an ellipsis and `????` collapsing to three are both on
/// it, and both look like too much until a document written elsewhere arrives.
String _substituted(String value) {
  final String marked = _mark.hasMatch(value)
      ? value.replaceAllMapped(_marks, (Match match) => _marked[match.group(1)!.toLowerCase()]!)
      : value;

  if (!_rare.hasMatch(marked)) {
    return marked;
  }

  return marked
      .replaceAll('+-', '±')
      .replaceAll(_dots, '…')
      .replaceAllMapped(_afterMark, (Match match) => '${match.group(1)}..')
      .replaceAllMapped(_manyMarks, (Match match) => match.group(1)! * 3)
      .replaceAll(_commas, ',')
      .replaceAllMapped(_emDash, (Match match) => '${match.group(1)}—')
      // Two hyphens twice, because "between two spaces" and "between two
      // characters that are neither" are the two ways a dash is written and
      // one pass cannot be both.
      .replaceAllMapped(_enDashApart, (Match match) => '${match.group(1)}–')
      .replaceAllMapped(_enDashTight, (Match match) => '${match.group(1)}–');
}

/// The same, with every bare address in the run left as it was written.
///
/// `http://a.co/a--b` is one address and `http://a.co/a–b` is another, and a
/// dash drawn into the middle of one is a link to a page that is not there. So
/// an address is never prose here — and whether it is going to be *drawn* as a
/// link does not come into it, since a reader copies the characters either way
/// and [InlineOptions.autolinkSchemes] would otherwise decide what a dash
/// means.
///
/// What counts as one is the destination rather than the shape. A run has to be
/// somewhere the link policy would follow, so `ftp://x.io/a--b` is an address
/// with the option off as much as on, while `re:invent...` and `TODO:fix...`
/// are the prose they look like — nothing on the allowlist is called `re` or
/// `TODO`, and a sentence should not lose its ellipsis to a colon.
String _typeset(String value) {
  final StringBuffer out = StringBuffer();
  int last = 0;
  int search = 0;

  while (search <= value.length) {
    final RegExpMatch? match = _wideLiteral.firstMatch(value.substring(search));

    if (match == null) {
      break;
    }

    final int at = search + match.start;
    final String whole = match.group(0)!;

    search = at + whole.length;

    final String text = _trimLiteral(whole);

    if (text.isEmpty || _addressUrl(text) == null) {
      continue;
    }

    out.write(_substituted(value.substring(last, at)));
    out.write(text);
    last = at + text.length;
    search = last;
  }

  if (last == 0) {
    return _substituted(value);
  }

  out.write(_substituted(value.substring(last)));

  return out.toString();
}

/// One place in the run, as the quotation marks are read.
///
/// A quotation mark is decided by what sits either side of it, and what sits
/// beside it is often in another node: the `"` in `**a** "b"` has the `a` of a
/// strong behind it. So the tree is flattened to this list first, and the
/// characters around a mark are then the ones next to it in the document rather
/// than the ones next to it in its own node.
class _Spot {
  _Spot({required this.node, required this.text, required this.depth, required this.stop});

  /// The node to rewrite, or `null` for one that is only read for context.
  final MdText? node;

  String text;

  /// How deep in the run it sits. A quotation may not be opened inside emphasis
  /// and closed outside it, the same way emphasis may not, so the pairing below
  /// only pairs marks that came from the same depth.
  final int depth;

  /// A hard break, which neither side reads across.
  final bool stop;
}

/// The run flattened, in the order a reader meets it.
///
/// [written] holds the start of every text node the document wrote as a
/// backslash escape. An author who typed `\\-\\-` meant two hyphens and an escape
/// is how Markdown says so, so those nodes go in as something to read and never
/// as something to rewrite — which is also why [_merge] was told to leave them
/// beside their neighbours rather than joining them in.
void _spotsIn(List<MdInline> nodes, int depth, Set<int> written, List<_Spot> into) {
  for (final MdInline node in nodes) {
    if (node is MdText) {
      into.add(
        _Spot(
          node: written.contains(node.range.start) ? null : node,
          text: node.value,
          depth: depth,
          stop: false,
        ),
      );
      continue;
    }

    // Read and never written: what a code span or a piece of markup says is the
    // characters the author typed, and this pass does not touch those. They
    // still sit next to a quotation mark and still decide which way it faces.
    if (node is MdInlineCode) {
      into.add(_Spot(node: null, text: node.value, depth: depth, stop: false));
      continue;
    }

    if (node is MdInlineHtml) {
      into.add(_Spot(node: null, text: node.value, depth: depth, stop: false));
      continue;
    }

    if (node is MdImage) {
      into.add(_Spot(node: null, text: node.alt, depth: depth, stop: false));
      continue;
    }

    if (node is MdBreak) {
      into.add(_Spot(node: null, text: '', depth: depth, stop: true));
      continue;
    }

    if (node is MdEmphasis) {
      _spotsIn(node.children, depth + 1, written, into);
      continue;
    }

    if (node is MdStrong) {
      _spotsIn(node.children, depth + 1, written, into);
      continue;
    }

    if (node is MdDelete) {
      _spotsIn(node.children, depth + 1, written, into);
      continue;
    }

    if (node is MdLink) {
      _spotsIn(node.children, depth + 1, written, into);
      continue;
    }

    if (node is MdTextDirective) {
      _spotsIn(node.children, depth + 1, written, into);
      continue;
    }
  }
}

/// The character in front of a position, or a space where the run begins.
String _before(List<_Spot> spots, int index, int at) {
  if (at > 0) {
    return spots[index].text[at - 1];
  }

  for (int each = index - 1; each >= 0; each -= 1) {
    if (spots[each].stop) {
      break;
    }

    final String text = spots[each].text;

    if (text.isNotEmpty) {
      return text[text.length - 1];
    }
  }

  return ' ';
}

/// And the one after it, or a space where the run ends.
String _after(List<_Spot> spots, int index, int at) {
  final String text = spots[index].text;

  if (at < text.length) {
    return text[at];
  }

  for (int each = index + 1; each < spots.length; each += 1) {
    if (spots[each].stop) {
      break;
    }

    final String next = spots[each].text;

    if (next.isNotEmpty) {
      return next[0];
    }
  }

  return ' ';
}

/// A quotation mark that opened and is waiting for the one that closes it.
class _QuoteOpener {
  _QuoteOpener({
    required this.spot,
    required this.at,
    required this.single,
    required this.depth,
    required this.under,
  });

  final int spot;
  final int at;
  final bool single;
  final int depth;

  /// The opener of the same kind underneath this one, so the heads unwind.
  final int under;
}

/// What to put where, once the mark that decides it has been read.
class _Change {
  _Change(this.at, this.character);

  final int at;
  final String character;
}

/// Every quotation mark in the run turned round the way it faces, and every
/// apostrophe drawn as one.
///
/// Which way a mark faces is not a property of the mark. `'` is an apostrophe
/// in `it's`, an opening mark in `'tis a pity` and a closing one in `dogs'
/// bones`, and the three are told apart by what is on either side: a mark may
/// open when something other than a space follows it, and may close when
/// something other than a space precedes it. A mark that could do both is
/// decided by the punctuation around it, and one that could do neither is an
/// apostrophe.
///
/// The marks that do open are kept on a stack until one closes them, so that
/// `"a 'b' c"` comes out nested rather than crossed. A mark nothing closes is
/// left exactly as the author typed it, which is what makes `5" 6"` still say
/// inches.
void _quoted(List<_Spot> spots, MawyQuotes quotes) {
  final List<_QuoteOpener> stack = <_QuoteOpener>[];
  final Map<int, List<_Change>> changes = <int, List<_Change>>{};
  int headSingle = -1;
  int headDouble = -1;

  void unwind(int to) {
    while (stack.length > to) {
      final _QuoteOpener opener = stack.removeLast();

      if (opener.single) {
        headSingle = opener.under;
      } else {
        headDouble = opener.under;
      }
    }
  }

  void change(int spot, int at, String character) {
    changes.putIfAbsent(spot, () => <_Change>[]).add(_Change(at, character));
  }

  bool full = false;

  for (int index = 0; index < spots.length && !full; index += 1) {
    final _Spot spot = spots[index];
    int above = stack.length - 1;

    // Anything opened deeper than here can no longer be closed, because the
    // node it was opened in has been left.
    while (above >= 0 && stack[above].depth > spot.depth) {
      above -= 1;
    }

    unwind(above + 1);

    if (spot.node == null) {
      continue;
    }

    final String text = spot.text;

    for (final RegExpMatch match in _quotes.allMatches(text)) {
      final int at = match.start;
      final bool single = match.group(0) == "'";
      final String last = _before(spots, index, at);
      final String next = _after(spots, index, at + 1);
      final bool lastSpace = _whitespace.hasMatch(last);
      final bool nextSpace = _whitespace.hasMatch(next);
      final bool lastMark = _punctuation.hasMatch(last);
      final bool nextMark = _punctuation.hasMatch(next);

      bool canOpen = true;
      bool canClose = true;

      if (nextSpace) {
        canOpen = false;
      } else if (nextMark && !(lastSpace || lastMark)) {
        canOpen = false;
      }

      if (lastSpace) {
        canClose = false;
      } else if (lastMark && !(nextSpace || nextMark)) {
        canClose = false;
      }

      // `5" 6"` is five feet six, and neither mark is a quotation.
      if (!single && next == '"' && _digit.hasMatch(last)) {
        canOpen = false;
        canClose = false;
      }

      if (canOpen && canClose) {
        canOpen = lastMark;
        canClose = nextMark;
      }

      if (!canOpen && !canClose) {
        if (single) {
          change(index, at, _apostrophe);
        }

        continue;
      }

      if (canClose) {
        final int which = single ? headSingle : headDouble;

        if (which >= 0 && stack[which].depth == spot.depth) {
          final _QuoteOpener opener = stack[which];

          change(index, at, single ? quotes.singleClose : quotes.doubleClose);
          change(opener.spot, opener.at, single ? quotes.singleOpen : quotes.doubleOpen);
          unwind(which);
          continue;
        }
      }

      if (canOpen) {
        if (stack.length >= _openers) {
          full = true;
          break;
        }

        stack.add(
          _QuoteOpener(
            spot: index,
            at: at,
            single: single,
            depth: spot.depth,
            under: single ? headSingle : headDouble,
          ),
        );

        if (single) {
          headSingle = stack.length - 1;
        } else {
          headDouble = stack.length - 1;
        }

        continue;
      }

      // Not an opener and nothing to close: a single mark here is an apostrophe
      // after all, as in `dogs' bones`.
      if (single) {
        change(index, at, _apostrophe);
      }
    }
  }

  // Written back at the end rather than as they are found, because an opening
  // mark is only known to be one once the mark that closes it has been read,
  // and by then the run has been walked past the node it sits in.
  changes.forEach((int index, List<_Change> list) {
    final MdText node = spots[index].node!;
    final List<_Change> sorted = list.toList()
      ..sort((_Change one, _Change other) => one.at.compareTo(other.at));
    final StringBuffer out = StringBuffer();
    int from = 0;

    for (final _Change each in sorted) {
      out.write(node.value.substring(from, each.at));
      out.write(each.character);
      from = each.at + 1;
    }

    out.write(node.value.substring(from));
    node.value = out.toString();
  });
}

/// The typographer, over one run of inline content.
///
/// Two passes and the order matters: the substitutions first, because they
/// change how long a text node is and the quotation marks are found by
/// position; then the marks, which need the run flattened and so cannot be done
/// a node at a time.
///
/// The nodes are rewritten where they stand. They were built a moment ago by
/// [parseInline] and nothing else has seen them yet.
void _typography(List<MdInline> nodes, Set<int> written, MawyQuotes quotes) {
  final List<_Spot> spots = <_Spot>[];

  _spotsIn(nodes, 0, written, spots);

  for (final _Spot spot in spots) {
    final MdText? node = spot.node;

    if (node != null) {
      node.value = _typeset(node.value);
      spot.text = node.value;
    }
  }

  _quoted(spots, quotes);
}

/* -------------------------------------------------------------------------
 * Tidying
 * ---------------------------------------------------------------------- */

/// Adjacent text nodes joined, empty ones dropped.
/// `apart` names the text nodes to leave where they are, by the offset each
/// starts at: a character the document wrote as a backslash escape is its own
/// node, and the typographer has to still be able to tell it from the
/// characters around it. It is null every other time this runs, including the
/// run after the typographer has finished, which is what puts those nodes back
/// with their neighbours.
List<MdInline> _merge(List<MdInline> nodes, [Set<int>? apart]) {
  final List<MdInline> out = <MdInline>[];
  // The run of text being joined, if the last node out was one. A buffer
  // rather than the node's own string, because a Dart string is immutable and
  // joining a run of them one at a time copies the whole run on every piece:
  // a paragraph of `[a](` repeated is half a million pieces, and the copying
  // was most of the time it took to read it. Emptied into the node the moment
  // anything else goes out, which is what [_settle] is for.
  MdText? joining;
  StringBuffer? joined;

  void settle() {
    if (joining != null && joined != null) {
      joining!.value = joined.toString();
    }

    joining = null;
    joined = null;
  }

  for (final MdInline node in nodes) {
    if (node is MdText) {
      if (node.value.isEmpty) {
        continue;
      }

      if (apart != null &&
          (apart.contains(node.range.start) ||
              (joining != null && apart.contains(joining!.range.start)))) {
        settle();
      }

      if (joining != null) {
        joined!.write(node.value);
        joining!.range = MdRange(joining!.range.start, node.range.end);
        continue;
      }

      joining = MdText(node.range, node.value);
      joined = StringBuffer(node.value);
      out.add(joining!);
      continue;
    }

    settle();

    if (node is MdEmphasis) {
      out.add(MdEmphasis(node.range, _merge(node.children, apart)));
      continue;
    }

    if (node is MdStrong) {
      out.add(MdStrong(node.range, _merge(node.children, apart)));
      continue;
    }

    if (node is MdDelete) {
      out.add(MdDelete(node.range, _merge(node.children, apart)));
      continue;
    }

    if (node is MdLink) {
      out.add(
        MdLink(
          node.range,
          url: node.url,
          title: node.title,
          children: _merge(node.children, apart),
        ),
      );
      continue;
    }

    out.add(node);
  }

  settle();

  return out;
}

/// What a run of inline nodes says, with the formatting taken off.
String toPlainText(List<MdInline> nodes) {
  final StringBuffer out = StringBuffer();

  for (final MdInline node in nodes) {
    if (node is MdText) {
      out.write(node.value);
    } else if (node is MdInlineCode) {
      out.write(node.value);
    } else if (node is MdImage) {
      out.write(node.alt);
    } else if (node is MdBreak) {
      out.write(' ');
    } else if (node is MdFootnoteReference || node is MdInlineHtml) {
      // A footnote's number is not part of what the sentence says, and a
      // heading with one in it should slug and outline without it.
      continue;
    } else if (node is MdEmphasis) {
      out.write(toPlainText(node.children));
    } else if (node is MdStrong) {
      out.write(toPlainText(node.children));
    } else if (node is MdDelete) {
      out.write(toPlainText(node.children));
    } else if (node is MdLink) {
      out.write(toPlainText(node.children));
    } else if (node is MdTextDirective) {
      // What its label says is what the sentence says. The package does not
      // know what the directive is, and a heading is slugged from the words
      // either way.
      out.write(toPlainText(node.children));
    }
  }

  return out.toString();
}

/* -------------------------------------------------------------------------
 * The scanner
 * ---------------------------------------------------------------------- */

final RegExp _hardBreak = RegExp(r'[ \t]{2,}$');
final RegExp _trailingSpace = RegExp(r'[ \t]+$');

/// Reads [raw] into inline nodes.
List<MdInline> parseInline(Sourced raw, InlineOptions options) {
  final String source = raw.text;
  final _State state = _State();

  /// Where each character the document wrote as a backslash escape ended up.
  final Set<int> escaped = <int>{};
  final _Reach reach = _Reach();
  final _Chain chunks = state.chunks;
  final List<_Chunk?> delimiters = state.delimiters;
  final List<_Chunk> openers = state.openers;

  /// Where a stretch of this text sits in the document.
  MdRange span(int from, int to) => rangeOf(raw, from, to);

  /// A buffer rather than a string, which is the one place this file reads
  /// differently from its TypeScript half. Most of a paragraph arrives here a
  /// character at a time, and a Dart string is immutable, so appending to one
  /// copies everything held so far and a paragraph cost the square of its own
  /// length. A JavaScript engine already does this much behind `+=`.
  final StringBuffer pending = StringBuffer();
  int pendingAt = 0;
  int at = 0;

  /// Characters that are going to be a text node, once something ends it.
  void hold(String text, int from) {
    if (pending.isEmpty) {
      pendingAt = from;
    }

    pending.write(text);
  }

  void flush() {
    if (pending.isNotEmpty) {
      _append(
        chunks,
        _textChunk(decodeEntities(pending.toString()), span(pendingAt, pendingAt + pending.length)),
      );
      pending.clear();
    }
  }

  /// Where in [delimiters] the run that follows this chunk begins.
  ///
  /// Asked of where each chunk was written rather than of where it sits in the
  /// list, because the two orders are the same one — chunks are appended as the
  /// source is read, and what replaces a span of them covers that same span —
  /// and the list position had to be searched for. Searching it for every
  /// delimiter, on every link that closes, was the length of a paragraph cubed
  /// for a paragraph that is a list of links.
  int delimiterBottom(_Chunk chunk) {
    final int after = chunk.node.range.start;

    for (int index = 0; index < delimiters.length; index += 1) {
      final _Chunk? each = delimiters[index];

      if (each != null && each.node.range.start > after) {
        return index;
      }
    }

    return delimiters.length;
  }

  while (at < source.length) {
    final String character = source[at];

    /* A backslash: an escape, or a hard break at the end of a line. */
    if (character == r'\') {
      final String next = _at(source, at + 1);

      if (next == '\n') {
        flush();
        _append(chunks, _Chunk(MdBreak(span(at, at + 2))));
        at += 2;

        while (at < source.length && _whitespace.hasMatch(source[at]) && source[at] != '\n') {
          at += 1;
        }

        continue;
      }

      if (next.isNotEmpty && _isEscapableCode(next.codeUnitAt(0))) {
        final _Chunk chunk = _textChunk(next, span(at, at + 2));

        flush();
        _append(chunks, chunk);

        // Only the typographer asks, and only it pays for the answer.
        if (options.typographer) {
          escaped.add(chunk.node.range.start);
        }

        at += 2;
        continue;
      }

      hold(character, at);
      at += 1;
      continue;
    }

    if (character == '`') {
      final _CodeSpan? code = _readCodeSpan(source, at);

      if (code != null) {
        flush();
        _append(chunks, _Chunk(MdInlineCode(span(at, code.end), code.value)));
        at = code.end;
        continue;
      }

      int run = 0;

      while (_at(source, at + run) == '`') {
        run += 1;
      }

      hold(source.substring(at, at + run), at);
      at += run;
      continue;
    }

    if (character == '<') {
      final String rest = source.substring(at);
      final RegExpMatch? uri = _autolinkUri.firstMatch(rest);

      if (uri != null) {
        final String? url = safeUrl(uri.group(1)!);
        final MdRange range = span(at, at + uri.group(0)!.length);
        final MdRange inside = span(at + 1, at + 1 + uri.group(1)!.length);

        flush();
        _append(
          chunks,
          url != null
              ? _Chunk(
                  MdLink(
                    range,
                    url: url,
                    title: null,
                    children: <MdInline>[MdText(inside, uri.group(1)!)],
                  ),
                )
              : _textChunk(uri.group(1)!, range),
        );
        at += uri.group(0)!.length;
        continue;
      }

      final RegExpMatch? email = _autolinkEmail.firstMatch(rest);

      if (email != null) {
        flush();
        _append(
          chunks,
          _Chunk(
            MdLink(
              span(at, at + email.group(0)!.length),
              url: 'mailto:${email.group(1)!}',
              title: null,
              children: <MdInline>[
                MdText(span(at + 1, at + 1 + email.group(1)!.length), email.group(1)!),
              ],
            ),
          ),
        );
        at += email.group(0)!.length;
        continue;
      }

      final RegExpMatch? html = _inlineHtml.firstMatch(rest);

      if (html != null) {
        flush();
        // Whether this reaches the page as markup or as four visible characters
        // is the renderer's decision, not the parser's — the tree says what the
        // document says.
        _append(chunks, _Chunk(MdInlineHtml(span(at, at + html.group(0)!.length), html.group(0)!)));
        at += html.group(0)!.length;
        continue;
      }

      hold(character, at);
      at += 1;
      continue;
    }

    /* A directive: a construct this parser reads and does not understand. */
    if (character == ':' && _at(source, at - 1) != ':' && _at(source, at + 1) != ':') {
      final DirectiveHead? head = readDirectiveHead(source, at + 1);
      // A name on its own is not enough here. A colon is a colon in far more
      // sentences than it is a directive — `Note:` and `see:foo` among them —
      // so an inline one has to carry a `[label]` or `{attributes}` to be one.
      final bool named = head != null && head.end > at + 1 + head.name.length;

      if (head != null && named) {
        final DirectiveLabel? label = head.label;

        flush();
        _append(
          chunks,
          _Chunk(
            MdTextDirective(
              span(at, head.end),
              name: head.name,
              attributes: head.attributes,
              children: label == null
                  ? <MdInline>[]
                  : parseInline(slice(raw, label.start, label.end), options),
            ),
          ),
        );
        at = head.end;
        continue;
      }
    }

    /* A footnote, which is a label that points at a block written elsewhere. */
    if (character == '[' && _at(source, at + 1) == '^') {
      final int close = source.indexOf(']', at + 2);
      final String label = close == -1 ? '' : normalizeLabel(source.substring(at + 2, close));

      if (label.isNotEmpty && options.footnotes.contains(label)) {
        flush();
        _append(chunks, _Chunk(MdFootnoteReference(span(at, close + 1), label)));
        at = close + 1;
        continue;
      }
    }

    if (character == '[' || (character == '!' && _at(source, at + 1) == '[')) {
      final bool image = character == '!';
      final String text = image ? '![' : '[';

      flush();

      final _Chunk chunk = _textChunk(text, span(at, at + text.length));

      chunk.opener = _Opener(image: image, active: true, textStart: at + text.length);
      _append(chunks, chunk);
      openers.add(chunk);
      at += text.length;
      continue;
    }

    if (character == ']') {
      flush();

      final _Chunk? openerChunk = openers.isEmpty ? null : openers.removeLast();

      if (openerChunk?.opener == null) {
        _append(chunks, _textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      final _Opener opener = openerChunk!.opener!;

      if (!opener.active) {
        // Deactivated by a link that closed inside this one. Both brackets are
        // now text — the opening one stays exactly where it was written.
        _append(chunks, _textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      final String labelText = source.substring(opener.textStart, at);
      _Destination? destination;
      int end = at + 1;

      if (_at(source, at + 1) == '(') {
        destination = _readInlineDestination(source, at + 1, reach);

        if (destination != null) {
          end = destination.end;
        }
      }

      if (destination == null) {
        final _Reference? reference = _readReferenceLabel(source, at + 1);
        final String label = normalizeLabel(
          reference != null && reference.label.isNotEmpty ? reference.label : labelText,
        );
        final MdDefinition? found = label.isEmpty ? null : options.definitions[label];

        // A shortcut reference cannot have a bracket in its label — but an
        // *escaped* one is a bracket the label is allowed to contain, so the
        // escapes go before the question is asked and `[Foo*bar\]]` is one
        // label rather than a failed reference.
        if (found != null &&
            (reference != null ||
                !RegExp(r'[\[\]]').hasMatch(labelText.replaceAll(_anyEscape, '')))) {
          destination = _Destination(
            found.url,
            found.title,
            reference != null ? reference.end : at + 1,
          );
          end = destination.end;
        }
      }

      if (destination == null) {
        // Not a link after all. The bracket that opened it is text, and so is
        // this one — but the opener is gone, so a later `]` cannot claim it.
        openerChunk.opener = null;
        _append(chunks, _textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      _processEmphasis(state, delimiterBottom(openerChunk));

      // Everything after the opener is this link's own label.
      final ({List<MdInline> children, int depth}) inside = _between(openerChunk, null);
      final List<MdInline> children = inside.children;
      final String? url = opener.image ? safeImageUrl(destination.url) : safeUrl(destination.url);
      final int depth = inside.depth + 1;
      final MdRange range = MdRange(openerChunk.node.range.start, endOffset(raw, end));

      if (opener.image && url != null) {
        // An image is one node however deep its description was: the words are
        // all that is kept of it.
        _cut(chunks, openerChunk);
        _append(
          chunks,
          _Chunk(MdImage(range, url: url, title: destination.title, alt: toPlainText(children))),
        );
      } else if (opener.image) {
        // A destination we will not follow. An image has nothing to fall back
        // to but the words the author wrote in place of it.
        _cut(chunks, openerChunk);
        _append(chunks, _textChunk(toPlainText(children), range));
      } else if (url != null && depth <= _nesting) {
        _cut(chunks, openerChunk);
        _append(
          chunks,
          _Chunk(MdLink(range, url: url, title: destination.title, children: children), depth),
        );
      } else {
        // The same for a link: the label stays and reads as ordinary text, so a
        // reader sees the sentence rather than a control that does nothing.
        // A link too deep to wrap lands here as well, keeping its label and
        // losing only what it pointed at. See [_nesting].
        _unlink(chunks, openerChunk);
      }

      if (!opener.image) {
        for (final _Chunk other in openers) {
          // Link openers only. An image's description is allowed to hold a
          // link, so the `![` further out is still an image waiting to close.
          if (other.opener?.image ?? true) {
            continue;
          }

          other.opener?.active = false;
        }
      }

      at = end;
      continue;
    }

    if (character == '*' || character == '_' || (options.gfm && character == '~')) {
      int run = 0;

      while (_at(source, at + run) == character) {
        run += 1;
      }

      // GitHub's strikethrough is exactly two tildes. One is a tilde, and three
      // is somebody drawing a line.
      if (character == '~' && run != 2) {
        hold(source.substring(at, at + run), at);
        at += run;
        continue;
      }

      final List<bool> sides = _flanking(source, at, at + run);
      final bool left = sides[0];
      final bool right = sides[1];
      final bool canOpen = character == '_'
          ? left && (!right || _punctuation.hasMatch(at > 0 ? source[at - 1] : ' '))
          : left;
      final bool canClose = character == '_'
          ? right &&
                (!left || _punctuation.hasMatch(at + run < source.length ? source[at + run] : ' '))
          : right;

      flush();

      final _Chunk chunk = _textChunk(source.substring(at, at + run), span(at, at + run));

      chunk.delimiter = _Delimiter(
        char: character,
        length: run,
        original: run,
        canOpen: canOpen,
        canClose: canClose,
      );
      _append(chunks, chunk);
      delimiters.add(chunk);
      at += run;
      continue;
    }

    if (character == '\n') {
      final String held = pending.toString();
      final bool hard = _hardBreak.hasMatch(held);
      final String trimmed = held.replaceAll(_trailingSpace, '');

      // Read out and written back, which costs the line rather than the
      // paragraph: this happens once for each line the paragraph has.
      pending
        ..clear()
        ..write(trimmed);

      // A hard break is the spaces as well as the newline: they are what makes
      // it one, and they are no part of the text node in front of it.
      final int from = hard && trimmed.isNotEmpty ? pendingAt + trimmed.length : at;

      flush();

      _append(
        chunks,
        hard || options.breaks
            ? _Chunk(MdBreak(span(from, at + 1)))
            : _textChunk('\n', span(at, at + 1)),
      );

      at += 1;

      while (at < source.length && (source[at] == ' ' || source[at] == '\t')) {
        at += 1;
      }

      continue;
    }

    hold(character, at);
    at += 1;
  }

  flush();
  _processEmphasis(state, 0);

  final List<MdInline> read = <MdInline>[];

  for (_Chunk? each = chunks.head; each != null; each = each.next) {
    read.add(each.node);
  }

  // The escapes are held apart for the typographer and joined back in after it,
  // so the tree it leaves is the tree every other option would have left.
  List<MdInline> nodes = _merge(read, options.typographer ? escaped : null);

  // Before the linkifier rather than after it, so that an address is still the
  // characters it was written with when the linkifier reads one.
  if (options.typographer) {
    _typography(nodes, escaped, options.quotes);
    nodes = _merge(nodes);
  }

  return options.gfm
      ? _merge(_linkify(nodes, options.autolinkSchemes ? _wideLiteral : _literal))
      : nodes;
}
