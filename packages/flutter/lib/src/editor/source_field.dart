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

      final List<_Hit> hits = _hitsOn(line.text.length, from);

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

      for (int edge = 0; edge < edges.length - 1; edge += 1) {
        final int start = edges[edge];
        final int end = edges[edge + 1];

        if (end <= start) {
          continue;
        }

        final MdToken? run = _runOver(runs, start, end);
        final _Hit? hit = _hitOver(hits, start, end);
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

  /// [matches] cut down to one line, in that line's own offsets.
  ///
  /// A match can only be on one line — the query comes from a field with no
  /// newline in it — but it is clamped anyway, so that a stale match arriving
  /// a frame before the document it was found in cannot index past the end.
  List<_Hit> _hitsOn(int length, int from) {
    final List<_Hit> hits = <_Hit>[];

    for (int index = 0; index < matches.length; index += 1) {
      final int start = matches[index].start - from;
      final int end = matches[index].end - from;

      if (end > 0 && start < length) {
        hits.add(
          _Hit(start.clamp(0, length), end.clamp(0, length), current: index == currentMatch),
        );
      }
    }

    return hits;
  }
}

/// One match, on the line it was found on.
class _Hit {
  const _Hit(this.start, this.end, {required this.current});

  final int start;
  final int end;
  final bool current;
}

/// The coloured run a piece of a line sits inside, where there is one.
MdToken? _runOver(List<MdToken> runs, int start, int end) {
  for (final MdToken run in runs) {
    if (run.start <= start && end <= run.end) {
      return run;
    }
  }

  return null;
}

/// The match a piece of a line sits inside, where there is one.
_Hit? _hitOver(List<_Hit> hits, int start, int end) {
  for (final _Hit hit in hits) {
    if (hit.start <= start && end <= hit.end) {
      return hit;
    }
  }

  return null;
}

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
        Focus(
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

    return SizedBox(
      width: ruler.width,
      child: ClipRect(
        child: CustomPaint(
          painter: _Numbers(editable: editable, text: text, style: style, scroller: scroller),
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
class _Numbers extends CustomPainter {
  _Numbers({
    required this.editable,
    required this.text,
    required this.style,
    required this.scroller,
  }) : super(repaint: scroller);

  final GlobalKey<EditableTextState> editable;
  final String text;
  final TextStyle style;
  final ScrollController? scroller;

  @override
  void paint(Canvas canvas, Size size) {
    final RenderEditable? field = editable.currentState?.renderEditable;

    if (field == null || !field.hasSize) {
      return;
    }

    final double line = (style.fontSize ?? 14) * (style.height ?? 1);
    int at = 0;
    int number = 1;

    while (at <= text.length) {
      final double top = field.getLocalRectForCaret(TextPosition(offset: at)).top;

      if (top > size.height) {
        break;
      }

      if (top > -line) {
        final TextPainter drawn = TextPainter(
          text: TextSpan(text: '$number', style: style),
          textDirection: TextDirection.ltr,
        )..layout();

        // Against the trailing edge, the way `text-align: end` puts it.
        drawn.paint(canvas, Offset(size.width - drawn.width, top));
      }

      final int next = text.indexOf('\n', at);

      if (next == -1) {
        break;
      }

      at = next + 1;
      number += 1;
    }
  }

  @override
  bool shouldRepaint(_Numbers old) => old.text != text || old.style != style;
}
