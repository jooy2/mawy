/// The find bar, over whichever surface asked for one.
///
/// It exists for the reason the React package's does, said in Flutter terms: a
/// platform's own find reaches a page of text and does not reach the inside of
/// a text field, and the source surface is one. On the desktop and the web
/// there is no platform find over a Flutter view at all, so the viewer needs
/// this bar for the plainer reason that nothing else would do it.
///
/// Two fields and six buttons in the editor, one field and four in the viewer —
/// there being nothing there to put anything in place of — built on
/// `package:flutter/widgets.dart` like everything else here, which is why the
/// fields are [EditableText] rather than a `TextField`, that being Material's
/// and bringing Material's palette with it.
library;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/toolbar.dart';
import 'package:mawy/src/theme/tokens.dart';

/// The bar itself.
class MawyFindBar extends StatefulWidget {
  /// Creates a find bar.
  const MawyFindBar({
    required this.tokens,
    required this.strings,
    required this.query,
    required this.onQueryChange,
    required this.matchCase,
    required this.onMatchCaseChange,
    required this.total,
    required this.current,
    required this.onStep,
    required this.onClose,
    this.replacement = '',
    this.onReplacementChange,
    this.onReplace,
    this.onReplaceAll,
    this.editable = false,
    super.key,
  });

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// What is being looked for.
  final String query;

  /// Called as it is typed.
  final ValueChanged<String> onQueryChange;

  /// What it would be replaced with.
  final String replacement;

  /// Called as that is typed. The second row is drawn only where it is given.
  final ValueChanged<String>? onReplacementChange;

  /// Whether `Foo` finds `foo`.
  final bool matchCase;

  /// Called when the switch is pressed.
  final ValueChanged<bool> onMatchCaseChange;

  /// How many matches there are.
  final int total;

  /// Which one the caret is on. `-1` for none.
  final int current;

  /// Called with `true` for the next match and `false` for the previous.
  final ValueChanged<bool> onStep;

  /// Replace the one the caret is on.
  ///
  /// Absent in the viewer, along with the rest of the second row. A row of two
  /// buttons that can never be pressed is not a smaller version of a feature;
  /// it is a promise the surface cannot keep.
  final VoidCallback? onReplace;

  /// Replace every one of them.
  final VoidCallback? onReplaceAll;

  /// Shut the bar.
  final VoidCallback onClose;

  /// Off while the document cannot be written to.
  final bool editable;

  @override
  State<MawyFindBar> createState() => _MawyFindBarState();
}

class _MawyFindBarState extends State<MawyFindBar> {
  final TextEditingController _query = TextEditingController();
  final TextEditingController _replacement = TextEditingController();
  final FocusNode _queryFocus = FocusNode(debugLabel: 'MawyFind query');
  final FocusNode _replacementFocus = FocusNode(debugLabel: 'MawyFind replacement');

  @override
  void initState() {
    super.initState();

    _query.value = TextEditingValue(
      text: widget.query,
      // Selected, not just filled in: the bar opens with whatever was under the
      // caret in it, and the first thing typed should replace that rather than
      // be appended to it.
      selection: TextSelection(baseOffset: 0, extentOffset: widget.query.length),
    );
    _replacement.text = widget.replacement;

    _query.addListener(() => widget.onQueryChange(_query.text));
    _replacement.addListener(() => widget.onReplacementChange?.call(_replacement.text));
  }

  @override
  void didUpdateWidget(MawyFindBar old) {
    super.didUpdateWidget(old);

    // The editor owns the query — opening the bar over a selection sets it —
    // so a value that arrived from outside is put back into the field.
    if (widget.query != _query.text) {
      _query.value = TextEditingValue(
        text: widget.query,
        selection: TextSelection.collapsed(offset: widget.query.length),
      );
    }
  }

  @override
  void dispose() {
    _query.dispose();
    _replacement.dispose();
    _queryFocus.dispose();
    _replacementFocus.dispose();
    super.dispose();
  }

  /// `Escape` shuts the bar, from either field.
  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }

    if (event.logicalKey == LogicalKeyboardKey.escape) {
      widget.onClose();

      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  /// `Enter` in either field: the next match, or the previous one with `Shift`.
  ///
  /// Taken from the field's own action rather than from a key event, because a
  /// Flutter view on the web puts a real DOM input under a focused field and
  /// the browser keeps `Enter` for itself — what arrives in the framework is
  /// this. Neither field submits anything; there is nothing to submit.
  void _submitted() {
    if (widget.total == 0) {
      return;
    }

    widget.onStep(!HardwareKeyboard.instance.isShiftPressed);
  }

  String get _count {
    if (widget.query.isEmpty) {
      return '';
    }

    if (widget.total == 0) {
      return widget.strings.findNoMatches;
    }

    return widget.strings.findMatches
        .replaceAll('%N', '${widget.current + 1}')
        .replaceAll('%T', '${widget.total}');
  }

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final MawyStrings strings = widget.strings;
    final bool none = widget.total == 0;

    return Semantics(
      container: true,
      label: strings.find,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onKeyEvent: _onKey,
        child: Container(
          decoration: BoxDecoration(
            color: tokens.backgroundSunken,
            border: Border(bottom: BorderSide(color: tokens.border)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: _Field(
                      tokens: tokens,
                      controller: _query,
                      focusNode: _queryFocus,
                      label: strings.find,
                      // The bar is opened to be typed in, so it takes the focus
                      // as it appears. `Escape` gives it back to the surface.
                      autofocus: true,
                      onSubmitted: _submitted,
                    ),
                  ),
                  // Said rather than only shown: a count nobody reads out is a
                  // count the person who most needs it does not have.
                  Semantics(
                    liveRegion: true,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 76),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        _count,
                        textAlign: TextAlign.end,
                        style: TextStyle(
                          color: tokens.foregroundMuted,
                          fontSize: 12,
                          fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ),
                  MawyToolbarButton(
                    icon: LucideIcons.caseSensitive,
                    label: strings.findMatchCase,
                    tokens: tokens,
                    pressed: widget.matchCase,
                    onPressed: () => widget.onMatchCaseChange(!widget.matchCase),
                  ),
                  MawyToolbarButton(
                    icon: LucideIcons.chevronUp,
                    label: strings.findPrevious,
                    tokens: tokens,
                    enabled: !none,
                    onPressed: () => widget.onStep(false),
                  ),
                  MawyToolbarButton(
                    icon: LucideIcons.chevronDown,
                    label: strings.findNext,
                    tokens: tokens,
                    enabled: !none,
                    onPressed: () => widget.onStep(true),
                  ),
                  MawyToolbarButton(
                    icon: LucideIcons.x,
                    label: strings.findClose,
                    tokens: tokens,
                    onPressed: widget.onClose,
                  ),
                ],
              ),
              if (widget.onReplace != null && widget.onReplaceAll != null) ...<Widget>[
                const SizedBox(height: 6),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: _Field(
                        tokens: tokens,
                        controller: _replacement,
                        focusNode: _replacementFocus,
                        label: strings.replace,
                        autofocus: false,
                        onSubmitted: _submitted,
                      ),
                    ),
                    MawyToolbarButton(
                      icon: LucideIcons.replace,
                      label: strings.replaceOne,
                      tokens: tokens,
                      enabled: widget.editable && !none,
                      onPressed: widget.onReplace!,
                    ),
                    MawyToolbarButton(
                      icon: LucideIcons.replaceAll,
                      label: strings.replaceAll,
                      tokens: tokens,
                      enabled: widget.editable && !none,
                      onPressed: widget.onReplaceAll!,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// One line of text to type in.
class _Field extends StatelessWidget {
  const _Field({
    required this.tokens,
    required this.controller,
    required this.focusNode,
    required this.label,
    required this.autofocus,
    required this.onSubmitted,
  });

  final MawyTokens tokens;
  final TextEditingController controller;
  final FocusNode focusNode;
  final String label;
  final bool autofocus;

  /// `Enter`, as the platform reports it rather than as a key.
  final VoidCallback onSubmitted;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      textField: true,
      label: label,
      child: Container(
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 9),
        alignment: Alignment.centerLeft,
        decoration: BoxDecoration(
          color: tokens.background,
          borderRadius: BorderRadius.circular(MawyRadius.medium),
          border: Border.all(color: focusNode.hasFocus ? tokens.accent : tokens.borderStrong),
        ),
        child: EditableText(
          controller: controller,
          focusNode: focusNode,
          autofocus: autofocus,
          style: TextStyle(color: tokens.foreground, fontSize: 13),
          cursorColor: tokens.accent,
          backgroundCursorColor: tokens.border,
          selectionColor: tokens.accentSoft,
          maxLines: 1,
          // The action rather than a raw `Enter`, because on the web a field
          // with the focus is a real DOM input and the browser keeps the
          // keystroke: what reaches Flutter is this, and not a key event.
          //
          // `unspecified` rather than `search` or `done`, and that choice is
          // the whole of whether this works. Every named action means the
          // person is finished — the field gives up the focus and the platform
          // is handed a fresh input — and being finished is exactly what
          // pressing `Enter` in a find bar does not mean. `unspecified` is the
          // one the framework describes as not implying that.
          textInputAction: TextInputAction.unspecified,
          onSubmitted: (String _) => onSubmitted(),
          textAlign: TextAlign.start,
          enableInteractiveSelection: true,
          rendererIgnoresPointer: false,
        ),
      ),
    );
  }
}
