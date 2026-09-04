/// The Markdown source, coloured as it is typed.
///
/// The React package draws this as two layers: a transparent `<textarea>` over
/// a coloured copy of the same text, because the browser gives no way to colour
/// what is inside a text field. Flutter does — a [TextEditingController] is
/// asked for the spans it wants drawn — so there is one layer here and no grid
/// to keep in step, which is the one place this package has an easier job than
/// the other. What decides the colours is the same function either way:
/// `highlightMarkdown`, diffed between the two by `tool/parity.dart`.
library;

import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:mawy/src/editor/commands.dart';
import 'package:mawy/src/editor/scroll.dart';
import 'package:mawy/src/editor/search.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/markdown/highlight.dart';
import 'package:mawy/src/theme/tokens.dart';

/// A controller that hands the field coloured spans instead of plain text.
class MawySourceController extends TextEditingController {
  /// Creates a controller.
  MawySourceController({super.text});

  /// The palette to colour in. Set by the field before every build.
  MawyTokens tokens = MawyTokens.light;

  /// Whether GitHub's additions are read, which changes what is coloured.
  bool gfm = true;

  /// What the find bar found. Set by the field before every build.
  ///
  /// Painted here rather than selected, because a field has one selection and
  /// the find bar is holding the focus in a box of its own. Both packages draw
  /// it the same way: every match marked at once as the query is typed, and
  /// the one being stepped through marked more strongly, so that "next" goes
  /// somewhere visible rather than only moving a count.
  List<MawyMatch> matches = const <MawyMatch>[];

  /// Which of [matches] is being stepped through, or `-1` for none of them.
  int currentMatch = -1;

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final List<InlineSpan> spans = <InlineSpan>[];
    final List<MdHighlightedLine> lines = highlightMarkdown(text, gfm: gfm);
    int from = 0;

    _hitFrom = 0;

    for (int index = 0; index < lines.length; index += 1) {
      if (index > 0) {
        spans.add(const TextSpan(text: '\n'));
      }

      final MdHighlightedLine line = lines[index];
      final List<MdToken> runs = <MdToken>[];
      int at = 0;

      for (final MdToken token in line.tokens) {
        // A token that overlaps one already drawn is skipped rather than
        // trusted: the highlighter is approximate on purpose, and a span with a
        // negative length is an exception rather than a colour that is off.
        if (token.start < at || token.end > line.text.length) {
          continue;
        }

        runs.add(token);
        at = token.end;
      }

      // The matches on this line, taken from where the last line left off.
      // Both lists are in order, so this is one walk down the pair of them
      // rather than a look through every match for every line — the difference
      // between a keystroke costing the length of the document and costing the
      // length of the document times the number of matches in it.
      while (_hitFrom < matches.length && matches[_hitFrom].end <= from) {
        _hitFrom += 1;
      }

      final List<_Hit> hits = <_Hit>[];

      for (int each = _hitFrom; each < matches.length; each += 1) {
        if (matches[each].start >= from + line.text.length) {
          break;
        }

        hits.add(
          _Hit(
            (matches[each].start - from).clamp(0, line.text.length),
            (matches[each].end - from).clamp(0, line.text.length),
            current: each == currentMatch,
          ),
        );
      }

      // The colours and the matches are two separate answers about the same
      // characters — what the Markdown means, and what somebody is looking for
      // — so the line is cut at the edges of both and every piece is drawn
      // with whichever of them it falls inside.
      final Set<int> cuts = <int>{0, line.text.length};

      for (final MdToken run in runs) {
        cuts.addAll(<int>[run.start, run.end]);
      }

      for (final _Hit hit in hits) {
        cuts.addAll(<int>[hit.start, hit.end]);
      }

      final List<int> edges = cuts.toList()..sort();
      // The pieces come out left to right and both of these are already in
      // that order, so each is walked once across the line rather than searched
      // from the beginning for every piece.
      int nextRun = 0;
      int nextHit = 0;

      for (int edge = 0; edge < edges.length - 1; edge += 1) {
        final int start = edges[edge];
        final int end = edges[edge + 1];

        if (end <= start) {
          continue;
        }

        while (nextRun < runs.length && runs[nextRun].end <= start) {
          nextRun += 1;
        }

        while (nextHit < hits.length && hits[nextHit].end <= start) {
          nextHit += 1;
        }

        final MdToken? run = _runAt(runs, nextRun, start, end);
        final _Hit? hit = _hitAt(hits, nextHit, start, end);
        TextStyle? piece = run == null ? null : _styleFor(run.kind, tokens);

        if (hit != null) {
          piece = (piece ?? const TextStyle()).copyWith(
            backgroundColor: hit.current ? tokens.findCurrent : tokens.find,
          );
        }

        spans.add(TextSpan(text: line.text.substring(start, end), style: piece));
      }

      from += line.text.length + 1;
    }

    return TextSpan(style: style, children: spans);
  }

  /// The first match that might still be on the line being built.
  ///
  /// Reset at the top of every build and walked forward as the lines go by. A
  /// match can only be on one line — the query comes from a field with no
  /// newline in it — but each is clamped to the line anyway, so that a stale
  /// match arriving a frame before the document it was found in cannot index
  /// past the end.
  int _hitFrom = 0;
}

/// One match, on the line it was found on.
class _Hit {
  const _Hit(this.start, this.end, {required this.current});

  final int start;
  final int end;
  final bool current;
}

/// The coloured run at [at], if the piece from [start] to [end] is inside it.
MdToken? _runAt(List<MdToken> runs, int at, int start, int end) =>
    at < runs.length && runs[at].start <= start && end <= runs[at].end ? runs[at] : null;

/// The match at [at], if the piece from [start] to [end] is inside it.
_Hit? _hitAt(List<_Hit> hits, int at, int start, int end) =>
    at < hits.length && hits[at].start <= start && end <= hits[at].end ? hits[at] : null;

/// What each kind of run is drawn in.
///
/// Four colours and two weights out of sixteen names, which is the same pairing
/// `styles.css` makes: a source pane with a separate colour for every construct
/// is a page nobody can read.
TextStyle? _styleFor(MdTokenKind kind, MawyTokens tokens) => switch (kind) {
  MdTokenKind.heading => TextStyle(color: tokens.foreground, fontWeight: FontWeight.w700),
  MdTokenKind.marker ||
  MdTokenKind.rule ||
  MdTokenKind.task ||
  MdTokenKind.fence => TextStyle(color: tokens.accent, fontWeight: FontWeight.w600),
  MdTokenKind.quote || MdTokenKind.table => TextStyle(color: tokens.foregroundSubtle),
  MdTokenKind.code => TextStyle(color: tokens.highlightString),
  MdTokenKind.strong => TextStyle(color: tokens.foreground, fontWeight: FontWeight.w700),
  MdTokenKind.emphasis => TextStyle(color: tokens.foreground, fontStyle: FontStyle.italic),
  MdTokenKind.strike => TextStyle(
    color: tokens.foregroundMuted,
    decoration: TextDecoration.lineThrough,
  ),
  MdTokenKind.link || MdTokenKind.reference => TextStyle(color: tokens.accent),
  MdTokenKind.url => TextStyle(color: tokens.highlightFunction),
  MdTokenKind.html => TextStyle(color: tokens.highlightComment),
  MdTokenKind.escape => TextStyle(color: tokens.foregroundSubtle),
};

/// One formatting command, on its way from a chord to [MawySourceField].
class _CommandIntent extends Intent {
  const _CommandIntent(this.command);

  final MawyCommand command;
}

/// The keyboard, which is the editor's other interface.
///
/// `src/components/editor/MawyEditor.tsx` has the same table under the same
/// name, and the two are meant to stay the same keyboard: a toolbar that is the
/// only way to reach a command is a toolbar an editor cannot be used without a
/// pointer for.
///
/// Both spellings of the modifier, because which one a platform means by it is
/// the platform's business rather than something to sniff for. Undo is not here
/// and is Flutter's own, which is the decision written down in the guide; there
/// is nothing here for `Mod`+`S` to save to, and `Mod`+`F` is the editor's.
const Map<ShortcutActivator, Intent> _shortcuts = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.keyB, control: true): _CommandIntent(MawyCommand.bold),
  SingleActivator(LogicalKeyboardKey.keyB, meta: true): _CommandIntent(MawyCommand.bold),
  SingleActivator(LogicalKeyboardKey.keyI, control: true): _CommandIntent(MawyCommand.italic),
  SingleActivator(LogicalKeyboardKey.keyI, meta: true): _CommandIntent(MawyCommand.italic),
  SingleActivator(LogicalKeyboardKey.keyK, control: true): _CommandIntent(MawyCommand.link),
  SingleActivator(LogicalKeyboardKey.keyK, meta: true): _CommandIntent(MawyCommand.link),
  SingleActivator(LogicalKeyboardKey.keyE, control: true): _CommandIntent(MawyCommand.code),
  SingleActivator(LogicalKeyboardKey.keyE, meta: true): _CommandIntent(MawyCommand.code),
  SingleActivator(LogicalKeyboardKey.digit1, control: true): _CommandIntent(MawyCommand.heading1),
  SingleActivator(LogicalKeyboardKey.digit1, meta: true): _CommandIntent(MawyCommand.heading1),
  SingleActivator(LogicalKeyboardKey.digit2, control: true): _CommandIntent(MawyCommand.heading2),
  SingleActivator(LogicalKeyboardKey.digit2, meta: true): _CommandIntent(MawyCommand.heading2),
  SingleActivator(LogicalKeyboardKey.digit3, control: true): _CommandIntent(MawyCommand.heading3),
  SingleActivator(LogicalKeyboardKey.digit3, meta: true): _CommandIntent(MawyCommand.heading3),
  SingleActivator(LogicalKeyboardKey.digit0, control: true): _CommandIntent(MawyCommand.paragraph),
  SingleActivator(LogicalKeyboardKey.digit0, meta: true): _CommandIntent(MawyCommand.paragraph),
  SingleActivator(LogicalKeyboardKey.keyX, control: true, shift: true): _CommandIntent(
    MawyCommand.strikethrough,
  ),
  SingleActivator(LogicalKeyboardKey.keyX, meta: true, shift: true): _CommandIntent(
    MawyCommand.strikethrough,
  ),
};

/// The source surface: one text field, coloured, with the keys an editor needs.
///
/// A bare [EditableText] puts the caret where it is tapped and does nothing
/// else with a pointer: dragging across it selects nothing, a double tap takes
/// no word, and a long press on a touch screen raises no handles. All of that
/// lives in [TextSelectionGestureDetectorBuilder], which `TextField` builds
/// around its own field and this has to build around its own — the builder is
/// in `package:flutter/widgets.dart` rather than in Material, so using it costs
/// this package nothing it has refused elsewhere.
///
/// [EditableText.rendererIgnoresPointer] goes with it. The detector and the
/// renderer both want the pointer, and two things reading one gesture is a
/// caret that jumps to where a selection was meant to start.
class MawySourceField extends StatefulWidget {
  /// Creates the surface.
  const MawySourceField({
    required this.controller,
    required this.focusNode,
    required this.tokens,
    required this.strings,
    required this.gfm,
    required this.readOnly,
    required this.placeholder,
    required this.onEnter,
    required this.onIndent,
    required this.onCommand,
    this.scrollController,
    this.editableKey,
    this.lineNumbers = true,
    this.matches = const <MawyMatch>[],
    this.currentMatch = -1,
    super.key,
  });

  /// The document.
  final MawySourceController controller;

  /// Where the focus goes.
  final FocusNode focusNode;

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// Whether GitHub's additions are read.
  final bool gfm;

  /// Whether the document can be changed.
  final bool readOnly;

  /// What the field says when it is empty.
  final String placeholder;

  /// `Enter`, which carries a list marker down. `true` when it was handled.
  final bool Function() onEnter;

  /// `Tab` and `Shift`+`Tab`.
  final void Function({required bool out}) onIndent;

  /// What a formatting shortcut runs. Absent while the document is read only.
  final void Function(MawyCommand)? onCommand;

  /// The field's own scroller, where somebody outside wants to watch it.
  final ScrollController? scrollController;

  /// The key on the [EditableText], for whoever needs to measure the text.
  ///
  /// The editor does, in `split`: where a line of the source sits is half of
  /// what lines the preview up with it, and only the field knows.
  final GlobalKey<EditableTextState>? editableKey;

  /// Whether the lines are numbered down the leading edge.
  final bool lineNumbers;

  /// What the find bar found, drawn behind the text. See the controller.
  final List<MawyMatch> matches;

  /// Which of [matches] is being stepped through, or `-1` for none of them.
  final int currentMatch;

  @override
  State<MawySourceField> createState() => _MawySourceFieldState();
}

class _MawySourceFieldState extends State<MawySourceField>
    implements TextSelectionGestureDetectorBuilderDelegate {
  late final TextSelectionGestureDetectorBuilder _gestures = TextSelectionGestureDetectorBuilder(
    delegate: this,
  );

  @override
  late final GlobalKey<EditableTextState> editableTextKey =
      widget.editableKey ?? GlobalKey<EditableTextState>();

  /// The iOS gesture that opens a selection under a hard press.
  ///
  /// Off, and not because it is unwanted: what it opens is a magnifier and a
  /// toolbar, and both of those are Cupertino's. A gesture that starts
  /// something this package cannot finish is worse than one that does nothing.
  @override
  bool get forcePressEnabled => false;

  /// A read-only document is still one somebody selects and copies, which is
  /// what the argument's own documentation promises.
  @override
  bool get selectionEnabled => true;

  /// Whether `Escape` was the last key pressed, and so whether the next `Tab`
  /// leaves the surface rather than indenting. See [_onKey].
  bool _leaving = false;

  /// The keys this surface answers for, before the field sees them.
  ///
  /// `Tab` indents, and `Escape` is the way out. A text field that swallows
  /// `Tab` is a keyboard trap, and that is not a style opinion — somebody who
  /// cannot use a pointer would have no way to leave the editor at all. So the
  /// trap is opened rather than avoided: `Escape` once and the next `Tab` moves
  /// the focus, which is the rule CodeMirror, Monaco and GitHub's own editor
  /// all use, and the reason it is worth matching them is that anybody who has
  /// met one of those already knows it. The flag is cleared by anything else,
  /// so `Escape` never leaves the surface in a state a reader cannot see.
  ///
  /// The focus is moved by hand rather than by letting the key travel on: only
  /// a `WidgetsApp` binds `Tab` to traversal, and this package does not require
  /// one — the same reason `mawyActivate` writes out `Enter` and the space bar.
  ///
  /// This is `onKeyDown` in `MawyEditor.tsx`, and the two are meant to stay the
  /// same rule.
  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }

    if (event.logicalKey == LogicalKeyboardKey.escape) {
      _leaving = true;

      return KeyEventResult.ignored;
    }

    final bool wasLeaving = _leaving;

    _leaving = false;

    if (event.logicalKey == LogicalKeyboardKey.tab) {
      final bool back = HardwareKeyboard.instance.isShiftPressed;

      if (wasLeaving) {
        if (back) {
          widget.focusNode.previousFocus();
        } else {
          widget.focusNode.nextFocus();
        }

        return KeyEventResult.handled;
      }

      if (widget.readOnly) {
        return KeyEventResult.ignored;
      }

      widget.onIndent(out: back);

      return KeyEventResult.handled;
    }

    if (event.logicalKey == LogicalKeyboardKey.enter &&
        !HardwareKeyboard.instance.isShiftPressed &&
        widget.onEnter()) {
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final MawySourceController controller = widget.controller;
    final MawyTokens tokens = widget.tokens;

    controller.tokens = tokens;
    controller.gfm = widget.gfm;
    controller.matches = widget.matches;
    controller.currentMatch = widget.currentMatch;

    final TextStyle style = TextStyle(
      color: tokens.foreground,
      fontFamilyFallback: const <String>['Menlo', 'Consolas', 'Roboto Mono'],
      fontFamily: 'monospace',
      fontSize: 13.5,
      height: 1.7,
    );

    final Widget field = Stack(
      children: <Widget>[
        if (controller.text.isEmpty)
          Positioned(
            left: 0,
            top: 0,
            right: 0,
            child: IgnorePointer(
              child: Text(
                widget.placeholder,
                style: style.copyWith(color: tokens.foregroundSubtle),
              ),
            ),
          ),
        Shortcuts(
          shortcuts: _shortcuts,
          child: Actions(
            actions: <Type, Action<Intent>>{
              _CommandIntent: CallbackAction<_CommandIntent>(
                onInvoke: (_CommandIntent intent) {
                  widget.onCommand?.call(intent.command);

                  return null;
                },
              ),
            },
            child: Focus(
              onKeyEvent: _onKey,
              child: Semantics(
                // What the surface is called, and the way out of it. Both are the
                // React package's, said the way Flutter says them.
                label: widget.strings.source,
                hint: widget.strings.sourceEscape,
                child: _gestures.buildGestureDetector(
                  behavior: HitTestBehavior.translucent,
                  child: EditableText(
                    key: editableTextKey,
                    controller: controller,
                    focusNode: widget.focusNode,
                    scrollController: widget.scrollController,
                    readOnly: widget.readOnly,
                    style: style,
                    cursorColor: tokens.accent,
                    backgroundCursorColor: tokens.border,
                    selectionColor: tokens.accentSoft,
                    maxLines: null,
                    expands: true,
                    textAlign: TextAlign.start,
                    scrollPadding: const EdgeInsets.all(24),
                    // A selection is a run of text and not a row of blocks. The
                    // default fits a box to each run's own glyphs, so a line of
                    // Hangul and a line of Latin are highlighted at two different
                    // heights with a gap left between the lines. This is the
                    // browser's answer, and it is a knob a text field has.
                    selectionHeightStyle: ui.BoxHeightStyle.max,
                    selectionWidthStyle: ui.BoxWidthStyle.max,
                    // The detector above reads the pointer. Two things reading
                    // one gesture is a caret that jumps to where a selection
                    // was meant to start.
                    rendererIgnoresPointer: true,
                    enableInteractiveSelection: true,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );

    if (!widget.lineNumbers) {
      return Container(
        color: tokens.background,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: field,
      );
    }

    return Container(
      color: tokens.background,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          MawySourceGutter(
            editable: editableTextKey,
            text: controller.text,
            style: style.copyWith(color: tokens.foregroundSubtle),
            scroller: widget.scrollController,
          ),
          const SizedBox(width: _gutterGap),
          Expanded(child: field),
        ],
      ),
    );
  }
}

/// The gap between the numbers and the text, which is `--mawy-src-gap`.
const double _gutterGap = 14;

/// The column of line numbers down the leading edge of the source.
class MawySourceGutter extends StatelessWidget {
  /// Creates the column.
  const MawySourceGutter({
    required this.editable,
    required this.text,
    required this.style,
    required this.scroller,
    super.key,
  });

  /// The field the numbers belong to.
  final GlobalKey<EditableTextState> editable;

  /// The document, which says how many numbers there are and where they go.
  final String text;

  /// What the numbers are drawn in — the source's own type, in its faintest
  /// colour.
  final TextStyle style;

  /// The field's scroller, so the numbers move with the text.
  final ScrollController? scroller;

  @override
  Widget build(BuildContext context) {
    // Monospace, so the column is exactly as wide as its widest number and
    // nothing has to be measured twice — the arithmetic the stylesheet does
    // with `ch`.
    final int digits = '${'\n'.allMatches(text).length + 1}'.length;
    final TextPainter ruler = TextPainter(
      text: TextSpan(text: '0' * digits, style: style),
      textDirection: Directionality.of(context),
    )..layout();
    final double width = ruler.width;

    // A `TextPainter` holds a laid-out paragraph, which is memory the engine
    // gave it rather than memory Dart will collect. One made per build and
    // left is one leaked per build.
    ruler.dispose();

    return SizedBox(
      width: width,
      child: ClipRect(
        child: CustomPaint(
          painter: MawySourceNumbers(
            editable: editable,
            text: text,
            style: style,
            scroller: scroller,
          ),
        ),
      ),
    );
  }
}

/// The line numbers, painted beside the text they belong to.
///
/// Where a line *begins* is a question only the field can answer, because a
/// line that wrapped is two rows on the screen and one number down the side —
/// which is what the stylesheet's grid does over there, a row per line with the
/// number in the first column. So the numbers are painted from the caret rects
/// the laid-out field reports rather than from a second layout of the same
/// text: the two cannot drift, because there is only one.
///
/// A caret rect comes back where it is drawn, which is where it is in the text
/// less however far the field has been scrolled — exactly what a number painted
/// beside the line wants.
class MawySourceNumbers extends CustomPainter {
  /// Creates the painter.
  MawySourceNumbers({
    required this.editable,
    required this.text,
    required this.style,
    required this.scroller,
  }) : super(repaint: scroller);

  /// The field the numbers belong to.
  final GlobalKey<EditableTextState> editable;

  /// The document, which says how many numbers there are.
  final String text;

  /// What the numbers are drawn in.
  final TextStyle style;

  /// The field's scroller, so the numbers move with the text.
  final ScrollController? scroller;

  @override
  void paint(Canvas canvas, Size size) {
    final RenderEditable? field = editable.currentState?.renderEditable;

    if (field == null || !field.hasSize) {
      return;
    }

    final double line = (style.fontSize ?? 14) * (style.height ?? 1);
    final List<int> starts = lineStarts(text);

    double topOf(int index) => field.getLocalRectForCaret(TextPosition(offset: starts[index])).top;

    // The first line with any of it on the screen, found rather than counted
    // to. A line's top only ever moves down as the line number goes up, so the
    // search is a binary one — and without it a five-thousand-line document
    // showing forty of them asked the field where every line above the first
    // visible one was, on every frame it painted.
    int low = 0;
    int high = starts.length - 1;

    while (low < high) {
      final int middle = (low + high) ~/ 2;

      if (topOf(middle) > -line) {
        high = middle;
      } else {
        low = middle + 1;
      }
    }

    // One painter for the column rather than one per number: each of them
    // holds a paragraph the engine laid out, and a painter made and left is
    // that paragraph leaked.
    final TextPainter drawn = TextPainter(textDirection: TextDirection.ltr);

    for (int index = low; index < starts.length; index += 1) {
      final double top = topOf(index);

      if (top > size.height) {
        break;
      }

      drawn
        ..text = TextSpan(text: '${index + 1}', style: style)
        ..layout();

      // Against the trailing edge, the way `text-align: end` puts it.
      drawn.paint(canvas, Offset(size.width - drawn.width, top));
    }

    drawn.dispose();
  }

  /// Always, and the reason is that this cannot tell.
  ///
  /// What is painted comes from the field's own layout, which moves for
  /// reasons none of the fields here record: the pane got narrower and the
  /// lines rewrapped, the window changed shape, a scroll view resized. Any of
  /// those leaves the same text in the same style with every line somewhere
  /// else, and a column of numbers that stayed put beside them is worse than
  /// one repainted for nothing. The painting is a few dozen numbers.
  @override
  bool shouldRepaint(MawySourceNumbers old) => true;
}
