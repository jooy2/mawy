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

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
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

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final List<InlineSpan> spans = <InlineSpan>[];
    final List<MdHighlightedLine> lines = highlightMarkdown(text, gfm: gfm);

    for (int index = 0; index < lines.length; index += 1) {
      if (index > 0) {
        spans.add(const TextSpan(text: '\n'));
      }

      final MdHighlightedLine line = lines[index];
      int at = 0;

      for (final MdToken token in line.tokens) {
        // A token that overlaps one already drawn is skipped rather than
        // trusted: the highlighter is approximate on purpose, and a span with a
        // negative length is an exception rather than a colour that is off.
        if (token.start < at || token.end > line.text.length) {
          continue;
        }

        if (token.start > at) {
          spans.add(TextSpan(text: line.text.substring(at, token.start)));
        }

        spans.add(
          TextSpan(
            text: line.text.substring(token.start, token.end),
            style: _styleFor(token.kind, tokens),
          ),
        );
        at = token.end;
      }

      if (at < line.text.length) {
        spans.add(TextSpan(text: line.text.substring(at)));
      }
    }

    return TextSpan(style: style, children: spans);
  }
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
class MawySourceField extends StatelessWidget {
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

  @override
  Widget build(BuildContext context) {
    controller.tokens = tokens;
    controller.gfm = gfm;

    final TextStyle style = TextStyle(
      color: tokens.foreground,
      fontFamilyFallback: const <String>['Menlo', 'Consolas', 'Roboto Mono'],
      fontFamily: 'monospace',
      fontSize: 13.5,
      height: 1.7,
    );

    return Container(
      color: tokens.background,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Stack(
        children: <Widget>[
          if (controller.text.isEmpty)
            Positioned(
              left: 0,
              top: 0,
              right: 0,
              child: IgnorePointer(
                child: Text(placeholder, style: style.copyWith(color: tokens.foregroundSubtle)),
              ),
            ),
          Shortcuts(
            shortcuts: const <ShortcutActivator, Intent>{
              SingleActivator(LogicalKeyboardKey.tab): _IndentIntent(out: false),
              SingleActivator(LogicalKeyboardKey.tab, shift: true): _IndentIntent(out: true),
            },
            child: Actions(
              actions: <Type, Action<Intent>>{
                _IndentIntent: CallbackAction<_IndentIntent>(
                  onInvoke: (_IndentIntent intent) {
                    onIndent(out: intent.out);

                    return null;
                  },
                ),
              },
              child: Focus(
                onKeyEvent: (FocusNode node, KeyEvent event) {
                  final bool pressed = event is KeyDownEvent || event is KeyRepeatEvent;

                  if (pressed &&
                      event.logicalKey == LogicalKeyboardKey.enter &&
                      !HardwareKeyboard.instance.isShiftPressed &&
                      onEnter()) {
                    return KeyEventResult.handled;
                  }

                  return KeyEventResult.ignored;
                },
                child: EditableText(
                  controller: controller,
                  focusNode: focusNode,
                  readOnly: readOnly,
                  style: style,
                  cursorColor: tokens.accent,
                  backgroundCursorColor: tokens.border,
                  selectionColor: tokens.accentSoft,
                  maxLines: null,
                  expands: true,
                  textAlign: TextAlign.start,
                  scrollPadding: const EdgeInsets.all(24),
                  rendererIgnoresPointer: false,
                  enableInteractiveSelection: true,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// `Tab`, in whichever direction.
class _IndentIntent extends Intent {
  const _IndentIntent({required this.out});

  final bool out;
}
