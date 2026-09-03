/// The editor: the Markdown source, a live preview, and a switch between them.
///
/// Three surfaces rather than the React package's four, and the missing one is
/// worth saying out loud. `wysiwyg` there draws the document and edits it where
/// it is drawn, which rests entirely on `contenteditable` — a browser telling a
/// component what somebody tried to do to a tree, so the component can refuse it
/// and change the Markdown instead. Flutter has no such thing: an `EditableText`
/// owns a string, and drawing a document that is also a text field would mean a
/// second model of what the document is. A second model is a second opinion
/// about what a document means, and the two disagree the first time anybody
/// writes something unusual. So `plain`, `split` and `preview`, and the drawn
/// surface stays a viewer.
///
/// Everything else *is* the React package's, and provably: the commands, the
/// source colouring and the counts along the bottom are the same functions
/// under the same names, and `tool/parity.dart` diffs all three.
library;

import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/editor/commands.dart';
import 'package:mawy/src/editor/scroll.dart';
import 'package:mawy/src/editor/search.dart';
import 'package:mawy/src/editor/source_field.dart';
import 'package:mawy/src/editor/status.dart';
import 'package:mawy/src/internal/find_bar.dart';
import 'package:mawy/src/internal/focus_visible.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/overlay.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/markdown/parse.dart' show MawyParseOptions;
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';
import 'package:mawy/src/viewer/anchors.dart';
import 'package:mawy/src/viewer/mawy_viewer.dart';
import 'package:mawy/src/viewer/mawy_viewer_toolbar.dart';

/// Which surface the editor is showing.
enum MawyEditorMode {
  /// The Markdown source, coloured.
  plain,

  /// The source and the drawn document, side by side.
  split,

  /// The drawn document alone.
  preview,
}

/// One control on the editor's toolbar.
enum MawyEditorToolbarItem {
  /// The switch between the surfaces.
  mode,

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

  /// The three heading levels, and body text.
  heading,

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

  /// The find bar, over the source.
  find,

  /// A document, opened from wherever the application keeps them.
  ///
  /// Drawn only where [MawyEditor.onOpen] was given, because a file picker is
  /// a plugin rather than a widget: which one an application has already chosen
  /// is not a decision a Markdown editor should make on its behalf. The button
  /// is this package's; what it opens is yours.
  open,

  /// Light, dark, or whatever the platform says.
  colorScheme,

  /// A hairline, for grouping.
  separator,
}

/// What the editor counts along its bottom edge.
enum MawyEditorStatusItem {
  /// Line and column.
  position,

  /// How much is selected, when anything is.
  selection,

  /// How many lines.
  lines,

  /// How many words.
  words,

  /// How many characters.
  characters,

  /// How many bytes it would be on disk.
  size,
}

/// The surfaces an editor offers unless it is told otherwise.
const List<MawyEditorMode> kMawyEditorModes = <MawyEditorMode>[
  MawyEditorMode.plain,
  MawyEditorMode.split,
  MawyEditorMode.preview,
];

/// The toolbar an editor draws unless it is told otherwise.
const List<MawyEditorToolbarItem> kMawyEditorToolbar = <MawyEditorToolbarItem>[
  MawyEditorToolbarItem.mode,
  MawyEditorToolbarItem.separator,
  MawyEditorToolbarItem.heading,
  MawyEditorToolbarItem.bold,
  MawyEditorToolbarItem.italic,
  MawyEditorToolbarItem.strikethrough,
  MawyEditorToolbarItem.code,
  MawyEditorToolbarItem.link,
  MawyEditorToolbarItem.image,
  MawyEditorToolbarItem.separator,
  MawyEditorToolbarItem.quote,
  MawyEditorToolbarItem.bulletList,
  MawyEditorToolbarItem.orderedList,
  MawyEditorToolbarItem.taskList,
  MawyEditorToolbarItem.codeBlock,
  MawyEditorToolbarItem.rule,
  MawyEditorToolbarItem.separator,
  MawyEditorToolbarItem.find,
  MawyEditorToolbarItem.open,
  MawyEditorToolbarItem.colorScheme,
];

/// The counts an editor shows unless it is told otherwise.
const List<MawyEditorStatusItem> kMawyEditorStatus = <MawyEditorStatusItem>[
  MawyEditorStatusItem.position,
  MawyEditorStatusItem.selection,
  MawyEditorStatusItem.lines,
  MawyEditorStatusItem.words,
  MawyEditorStatusItem.characters,
  MawyEditorStatusItem.size,
];

/// A Markdown editor: the source, a preview, and a switch between them.
///
/// ```dart
/// MawyEditor(
///   defaultValue: '# Hello\n\nSome **Markdown**.',
///   onChange: (String value) => save(value),
/// )
/// ```
class MawyEditor extends StatefulWidget {
  /// Creates an editor.
  const MawyEditor({
    super.key,
    this.value,
    this.defaultValue = '',
    this.onChange,
    this.mode,
    this.defaultMode = MawyEditorMode.split,
    this.modes = kMawyEditorModes,
    this.onModeChange,
    this.toolbar = kMawyEditorToolbar,
    this.status = kMawyEditorStatus,
    this.parse = const MawyParseOptions(),
    this.colorScheme = MawyColorScheme.system,
    this.onColorSchemeChange,
    this.tokens,
    this.typography,
    this.defaultTypography = const MawyTypography(),
    this.locale = MawyLocale.en,
    this.directives,
    this.highlight,
    this.onLinkTap,
    this.readOnly = false,
    this.onOpen,
    this.lineNumbers = true,
    this.placeholder,
  });

  /// The document, where the application holds it.
  ///
  /// Leave it out and the editor holds its own, starting from [defaultValue] —
  /// the same two ways round every text field in Flutter offers.
  final String? value;

  /// What the editor starts with when it is holding its own document.
  final String defaultValue;

  /// Called with the document after every change.
  final ValueChanged<String>? onChange;

  /// Which surface is showing, where the application decides.
  final MawyEditorMode? mode;

  /// Which surface it opens on when it decides for itself.
  final MawyEditorMode defaultMode;

  /// Which surfaces the switch offers.
  final List<MawyEditorMode> modes;

  /// Called when the reader picks a different surface.
  final ValueChanged<MawyEditorMode>? onModeChange;

  /// The controls to draw, in the order to draw them. `const []` for none.
  final List<MawyEditorToolbarItem> toolbar;

  /// The counts to show along the bottom. `const []` for none.
  final List<MawyEditorStatusItem> status;

  /// How the Markdown is read.
  final MawyParseOptions parse;

  /// Which palette to draw in.
  final MawyColorScheme colorScheme;

  /// Called when the reader picks a different one.
  final ValueChanged<MawyColorScheme>? onColorSchemeChange;

  /// The colours to draw in. See [MawyViewer.tokens], which this is passed to.
  final MawyTokensBuilder? tokens;

  /// How the preview is set, where the application decides.
  final MawyTypography? typography;

  /// How it is set when the editor decides for itself.
  final MawyTypography defaultTypography;

  /// The language the editor's own interface is written in.
  final MawyLocale locale;

  /// What draws the constructs this package does not know about, in the
  /// preview.
  final Map<String, MawyDirectiveBuilder>? directives;

  /// What colours a code block in the preview. See [MawyViewer.highlight].
  final MawyHighlighter? highlight;

  /// What tapping a link in the preview does.
  final void Function(String url, String? title)? onLinkTap;

  /// Whether the document can be changed.
  final bool readOnly;

  /// What opening a document means, where the application has an answer.
  ///
  /// Without one there is no `open` button and no empty state offering to fill
  /// the editor: a control that cannot do what it says is worse than none. With
  /// one, an editor holding nothing says so and offers it — an empty editor is
  /// a place to bring a document to, and this is the way in.
  ///
  /// Reading the file is the application's; the string comes back through
  /// [value] and [onChange] like every other change to the document.
  final VoidCallback? onOpen;

  /// Whether the source surface numbers its lines. The React package's default
  /// is the same, and for the same reason: an editor is a place errors are
  /// reported by line.
  final bool lineNumbers;

  /// What the source surface says when it is empty.
  final String? placeholder;

  @override
  State<MawyEditor> createState() => _MawyEditorState();
}

class _MawyEditorState extends State<MawyEditor> {
  late final MawySourceController _controller = MawySourceController(
    text: widget.value ?? widget.defaultValue,
  );
  final FocusNode _focus = FocusNode();

  /// The two scrollers, and what lines them up. See `_syncScroll`.
  final ScrollController _sourceScroll = ScrollController();
  final ScrollController _previewScroll = ScrollController();
  final GlobalKey<EditableTextState> _editable = GlobalKey<EditableTextState>();
  final MawyViewerAnchors _anchors = MawyViewerAnchors();
  List<MawyScrollAnchor>? _places;
  double _measuredSource = -1;
  double _measuredPreview = -1;
  bool _syncing = false;

  late MawyEditorMode _mode = widget.mode ?? widget.defaultMode;
  late MawyColorScheme _scheme = widget.colorScheme;
  late MawyTypography _type = widget.typography ?? widget.defaultTypography;

  /// How much of the width the source pane has, in `split`.
  ///
  /// Half and half is a guess about what somebody is doing, and it is wrong as
  /// often as it is right: a wide window wants more preview while reading over
  /// a draft and more source while writing one. So the bar between them is
  /// something to take hold of.
  ///
  /// Held here rather than taken as an argument, for the reason a scroll offset
  /// is: where a pane's edge sits is the reader's, for as long as they are
  /// looking at it, and an application that needs to store it already has
  /// `value` and `onChange` for the thing worth storing.
  double _share = 0.5;

  /// The find bar, which is closed until somebody asks for it.
  ///
  /// It exists because a platform's own find reaches a page of text and not the
  /// inside of a text field, and the source surface is one.
  bool _finding = false;
  String _query = '';
  String _replacement = '';
  bool _matchCase = false;

  String get _value => _controller.text;
  MawyEditorMode get _current => widget.mode ?? _mode;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_changed);
    _sourceScroll.addListener(_syncScroll);
  }

  @override
  void didUpdateWidget(MawyEditor old) {
    super.didUpdateWidget(old);

    if (widget.value != null && widget.value != _controller.text) {
      _controller.value = _controller.value.copyWith(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value!.length),
        composing: TextRange.empty,
      );
    }

    if (widget.colorScheme != old.colorScheme) {
      _scheme = widget.colorScheme;
    }

    if (widget.typography != null && widget.typography != old.typography) {
      _type = widget.typography!;
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_changed);
    _controller.dispose();
    _focus.dispose();
    _sourceScroll.removeListener(_syncScroll);
    _sourceScroll.dispose();
    _previewScroll.dispose();
    super.dispose();
  }

  String _lastReported = '';

  void _changed() {
    if (_controller.text != _lastReported) {
      _lastReported = _controller.text;
      widget.onChange?.call(_controller.text);
    }

    // The document moved under both panes, so what was measured is wrong and
    // the preview has to catch up without waiting for somebody to scroll.
    _places = null;
    _afterLayout(_syncScroll);

    // The status bar and the toolbar's pressed states both read the selection,
    // so a caret that only moved is still a rebuild.
    setState(() {});
  }

  Brightness _brightness(BuildContext context) => switch (_scheme) {
    MawyColorScheme.light => Brightness.light,
    MawyColorScheme.dark => Brightness.dark,
    MawyColorScheme.system => MediaQuery.platformBrightnessOf(context),
  };

  /* ---------------------------------------------------------------------
   * The two panes, scrolling together
   * ------------------------------------------------------------------ */

  /// Runs [work] once the frame being built has been laid out.
  void _afterLayout(VoidCallback work) {
    WidgetsBinding.instance.addPostFrameCallback((Duration _) {
      if (mounted) {
        work();
      }
    });
  }

  /// How tall what is inside a scroller is, which is what changes when
  /// something moved: an edit, a font, a window, an image that arrived.
  double _extentOf(ScrollController scroller) => scroller.hasClients
      ? scroller.position.maxScrollExtent + scroller.position.viewportDimension
      : -1;

  /// The places the two panes agree on, in each one's own pixels.
  ///
  /// The source half is where a line begins in the field; the preview half is
  /// where the block that line opens ended up. Pairs that do not move both
  /// panes forward are dropped rather than kept and sorted — a block and the
  /// first block inside it start on the same line, and a pair that went
  /// backwards would take the preview back up in the middle of a scroll.
  List<MawyScrollAnchor> _measureAnchors() {
    final RenderEditable? field = _editable.currentState?.renderEditable;
    final List<(int, double)> blocks = _anchors.places();

    if (field == null || blocks.isEmpty) {
      return const <MawyScrollAnchor>[];
    }

    final List<int> starts = lineStarts(_value);
    final List<MawyScrollAnchor> found = <MawyScrollAnchor>[const MawyScrollAnchor(from: 0, to: 0)];

    // A `RenderEditable` scrolls itself rather than being scrolled by a viewport
    // around it, so a caret rect comes back where it is drawn — which is where
    // it is in the text, less however far the field has been scrolled. Adding
    // that back is what makes these the same kind of number the block offsets
    // beside them are, and what the source's own offset is compared against.
    final double scrolled = _sourceScroll.hasClients ? _sourceScroll.offset : 0;

    for (final (int start, double to) in blocks) {
      final int at = starts[lineAt(starts, start)];
      final double from = field.getLocalRectForCaret(TextPosition(offset: at)).top + scrolled;
      final MawyScrollAnchor last = found.last;

      if (from > last.from && to > last.to) {
        found.add(MawyScrollAnchor(from: from, to: to));
      }
    }

    final MawyScrollAnchor last = found.last;

    // The ends, so a document scrolled all the way down in one pane is all the
    // way down in the other rather than wherever the last block left it.
    found.add(
      MawyScrollAnchor(
        from: math.max(_extentOf(_sourceScroll), last.from + 1),
        to: math.max(_extentOf(_previewScroll), last.to + 1),
      ),
    );

    return found;
  }

  /// The preview follows the source, at the places the two of them agree on.
  ///
  /// Which places those are has to be measured, and measuring is a layout read
  /// per block — so the pairs are kept until something moves. The two content
  /// heights answer for nearly all of that, and an edit that leaves both
  /// exactly where they were drops the table anyway, from `_changed`.
  void _syncScroll() {
    if (_current != MawyEditorMode.split || _syncing) {
      return;
    }

    if (!_sourceScroll.hasClients || !_previewScroll.hasClients) {
      return;
    }

    final double source = _extentOf(_sourceScroll);
    final double preview = _extentOf(_previewScroll);

    if (_places == null || _measuredSource != source || _measuredPreview != preview) {
      _places = _measureAnchors();
      _measuredSource = source;
      _measuredPreview = preview;
    }

    final ScrollPosition position = _previewScroll.position;
    final List<MawyScrollAnchor> places = _places!;
    // Nothing to line up against — an empty document, or a preview that has not
    // been drawn yet. A fraction of the way through is the honest answer to a
    // question with nothing else in it.
    final double wanted = places.length > 1
        ? previewScrollFor(places, _sourceScroll.offset)
        : (_sourceScroll.offset / math.max(_sourceScroll.position.maxScrollExtent, 1)) *
              position.maxScrollExtent;

    // Jumped rather than animated. The preview is being dragged by the source,
    // and an animation started again on every frame of a scroll is one that
    // never arrives.
    _syncing = true;
    position.jumpTo(wanted.clamp(0, math.max(position.maxScrollExtent, 0)));
    _syncing = false;
  }

  EditState get _state {
    final TextSelection selection = _controller.selection;
    final int start = selection.start < 0 ? _value.length : selection.start;
    final int end = selection.end < 0 ? start : selection.end;

    return EditState(_value, start < end ? start : end, start < end ? end : start);
  }

  /// The document as a command left it, put back with the selection it asked
  /// for.
  void _apply(EditState after) {
    if (widget.readOnly) {
      return;
    }

    _controller.value = TextEditingValue(
      text: after.value,
      selection: TextSelection(baseOffset: after.start, extentOffset: after.end),
    );
    _focus.requestFocus();
  }

  void _run(MawyCommand command) => _apply(runCommand(command, _state));

  void _setMode(MawyEditorMode mode) {
    widget.onModeChange?.call(mode);

    if (widget.mode == null) {
      setState(() => _mode = mode);
    }

    // A pane that has just arrived has not been laid out and has nothing to
    // measure, and one that has just gone took its measurements with it.
    _places = null;
    _afterLayout(_syncScroll);
  }

  void _setScheme(MawyColorScheme scheme) {
    widget.onColorSchemeChange?.call(scheme);
    setState(() => _scheme = scheme);
  }

  /* ---------------------------------------------------------------------
   * Finding, and replacing
   * ------------------------------------------------------------------ */

  List<MawyMatch> get _matches =>
      _finding ? findMatches(_value, _query, _matchCase) : const <MawyMatch>[];

  /// Where the caret is, for the purpose of finding.
  ///
  /// A selection nobody has set yet is the top of the document rather than the
  /// end of it. [_state] reads the other way round on purpose — a command with
  /// nothing selected acts where the writing stopped — but pressing next in a
  /// document nobody has clicked in should find the first match, not the last.
  int get _findCaret {
    final TextSelection selection = _controller.selection;

    return selection.isValid ? selection.start : 0;
  }

  /// Which match the caret is sitting in, or `-1` when it is in none of them.
  ///
  /// Read from the caret rather than held in a state of its own, so that
  /// clicking somewhere in the document and pressing next goes to the match
  /// after where you clicked. A number that walked on its own would go back to
  /// wherever the last press left it, which is not where anybody is looking.
  int _inside(List<MawyMatch> matches) {
    final int caret = _findCaret;

    return matches.indexWhere((MawyMatch match) => match.start <= caret && caret <= match.end);
  }

  /// The one to say is current: the one the caret is in, or the nearest ahead.
  int _currentMatch(List<MawyMatch> matches) {
    final int on = _inside(matches);

    return on == -1 ? matchFrom(matches, _findCaret, forwards: true) : on;
  }

  void _goTo(MawyMatch match) {
    _controller.selection = TextSelection(baseOffset: match.start, extentOffset: match.end);

    // The selection moves; the focus does not follow it while the bar is open.
    // Somebody stepping through matches is typing in the find field, and a
    // document that takes the focus back on `Enter` is a document the next
    // keystroke is typed into — which is how a search turns into an edit
    // nobody asked for. What is set here is where the field picks up again
    // when the bar closes and hands it the focus.
    if (_finding) {
      // A field without the focus does not scroll to its own selection, so
      // the match is brought into view by hand.
      _editable.currentState?.bringIntoView(TextPosition(offset: match.start));

      return;
    }

    _focus.requestFocus();
  }

  void _step(List<MawyMatch> matches, {required bool forwards}) {
    if (matches.isEmpty) {
      return;
    }

    final int on = _inside(matches);
    // From the end of the match the caret is in rather than from the caret
    // itself, so pressing next twice does not find the same one twice.
    final int from = on == -1 ? _findCaret : (forwards ? matches[on].end : matches[on].start);

    _goTo(matches[matchFrom(matches, from, forwards: forwards)]);
  }

  void _replaceOne(List<MawyMatch> matches) {
    final int at = _currentMatch(matches);

    if (widget.readOnly || at == -1) {
      return;
    }

    final MawyReplaced after = replaceMatch(_value, matches[at], _replacement);

    _controller.value = TextEditingValue(
      text: after.value,
      selection: TextSelection.collapsed(offset: after.caret),
    );

    if (!_finding) {
      _focus.requestFocus();
    }
  }

  void _replaceEvery() {
    if (widget.readOnly) {
      return;
    }

    final MawyReplacedAll after = replaceAll(_value, _query, _replacement, _matchCase);

    if (after.count == 0) {
      return;
    }

    _controller.value = TextEditingValue(
      text: after.value,
      // Where the caret was, as far as the new document reaches. Sending it to
      // the end would lose the reader's place over one replacement.
      selection: TextSelection.collapsed(offset: _findCaret.clamp(0, after.value.length)),
    );

    if (!_finding) {
      _focus.requestFocus();
    }
  }

  void _openFind() {
    final TextSelection selection = _controller.selection;

    if (selection.isValid && !selection.isCollapsed) {
      final String selected = _value.substring(selection.start, selection.end);

      // What is selected is nearly always what somebody is about to look for,
      // and a selection that spans lines is nearly always not.
      if (selected.isNotEmpty && !selected.contains('\n')) {
        _query = selected;
      }
    }

    setState(() => _finding = true);
  }

  void _closeFind() {
    setState(() => _finding = false);
    _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final Brightness brightness = _brightness(context);
    final MawyTokens tokens = widget.tokens?.call(brightness) ?? MawyTokens.of(brightness);
    final MawyStrings strings = stringsFor(widget.locale);
    final bool showSource = _current != MawyEditorMode.preview;
    final bool showPreview = _current != MawyEditorMode.plain;
    final List<MawyMatch> matches = _matches;

    final Widget source = MawySourceField(
      controller: _controller,
      focusNode: _focus,
      tokens: tokens,
      strings: strings,
      gfm: widget.parse.gfm,
      readOnly: widget.readOnly,
      placeholder: widget.placeholder ?? strings.editorPlaceholder,
      onEnter: _enter,
      onIndent: _indent,
      onCommand: widget.readOnly ? null : _run,
      scrollController: _sourceScroll,
      editableKey: _editable,
      lineNumbers: widget.lineNumbers,
      matches: matches,
      currentMatch: _currentMatch(matches),
    );

    // A document with nothing in it draws nothing, and a pane drawing nothing
    // beside an empty editor is a rectangle that says less than a sentence
    // would. Where the application knows how to open one, this is the way in —
    // the React package's empty state, in the pane the document will appear in.
    final Widget preview = _value.trim().isEmpty && widget.onOpen != null && !widget.readOnly
        ? _Empty(tokens: tokens, strings: strings, onOpen: widget.onOpen!)
        : MawyViewer(
            value: _value,
            parse: widget.parse,
            colorScheme: _scheme,
            tokens: widget.tokens,
            typography: _type,
            toolbar: const <MawyViewerToolbarItem>[],
            locale: widget.locale,
            directives: widget.directives,
            highlight: widget.highlight,
            onLinkTap: widget.onLinkTap,
            scrollController: _previewScroll,
            // Where each block of the drawn document ended up, which is half of
            // what lines the two panes up. See `_syncScroll`.
            anchors: _anchors,
          );

    final Widget editor = Container(
      color: tokens.background,
      child: mawyOverlay(
        context,
        Column(
          // Every row here is the width of the editor and not the width of what
          // is in it. A `Column` centres its children by default, which left the
          // toolbar as wide as its buttons and floating in the middle of the bar
          // — with the rule under it stopping where the buttons stopped.
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            if (widget.toolbar.isNotEmpty)
              _Toolbar(
                items: widget.toolbar,
                tokens: tokens,
                strings: strings,
                state: _state,
                mode: _current,
                modes: widget.modes,
                onMode: _setMode,
                colorScheme: _scheme,
                onColorScheme: widget.onColorSchemeChange == null ? null : _setScheme,
                onCommand: widget.readOnly ? null : _run,
                finding: _finding && showSource,
                onFind: showSource ? _openFind : null,
                onOpen: widget.readOnly ? null : widget.onOpen,
              ),
            if (_finding && showSource)
              MawyFindBar(
                tokens: tokens,
                strings: strings,
                query: _query,
                onQueryChange: (String query) => setState(() => _query = query),
                replacement: _replacement,
                onReplacementChange: (String value) => setState(() => _replacement = value),
                matchCase: _matchCase,
                onMatchCaseChange: (bool on) => setState(() => _matchCase = on),
                total: matches.length,
                current: _currentMatch(matches),
                onStep: (bool forwards) => _step(matches, forwards: forwards),
                onReplace: () => _replaceOne(matches),
                onReplaceAll: _replaceEvery,
                onClose: _closeFind,
                editable: !widget.readOnly,
              ),
            Expanded(
              child: LayoutBuilder(
                builder: (BuildContext context, BoxConstraints room) => Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    if (showSource)
                      // A flex of a thousandth, so the share is a whole number of
                      // them and the two panes always add up to the width. A
                      // fractional `flex` is not a thing a `Row` has.
                      Flexible(flex: (_share * 1000).round(), child: source),
                    if (showSource && showPreview)
                      _Divider(
                        tokens: tokens,
                        strings: strings,
                        share: _share,
                        width: room.maxWidth,
                        onChange: (double next) => setState(() => _share = _clampShare(next)),
                      )
                    else if (showSource || showPreview)
                      const SizedBox.shrink(),
                    if (showPreview)
                      Flexible(
                        flex: showSource ? 1000 - (_share * 1000).round() : 1000,
                        child: preview,
                      ),
                  ],
                ),
              ),
            ),
            if (widget.status.isNotEmpty)
              _Status(items: widget.status, tokens: tokens, strings: strings, state: _state),
          ],
        ),
      ),
    );

    if (!showSource) {
      return editor;
    }

    // `Mod`+`F` opens the bar from wherever the focus is inside the editor, the
    // way it does in the React package. Both spellings, because which one a
    // platform means by "the modifier" is the platform's business.
    return Shortcuts(
      shortcuts: const <ShortcutActivator, Intent>{
        SingleActivator(LogicalKeyboardKey.keyF, control: true): _FindIntent(),
        SingleActivator(LogicalKeyboardKey.keyF, meta: true): _FindIntent(),
      },
      child: Actions(
        actions: <Type, Action<Intent>>{
          _FindIntent: CallbackAction<_FindIntent>(
            onInvoke: (_FindIntent _) {
              _openFind();

              return null;
            },
          ),
        },
        child: editor,
      ),
    );
  }

  /// `Enter` on a list item carries the marker down, and gives it up on an item
  /// still empty. `null` is "this is not a list item", and `Enter` is `Enter`.
  bool _enter() {
    final EditState? carried = continueList(_state, definitionLists: widget.parse.definitionLists);

    if (carried == null || widget.readOnly) {
      return false;
    }

    _apply(carried);

    return true;
  }

  void _indent({required bool out}) => _apply(indent(_state, out: out));
}

/* -------------------------------------------------------------------------
 * The toolbar
 * ---------------------------------------------------------------------- */

class _Toolbar extends StatefulWidget {
  const _Toolbar({
    required this.items,
    required this.tokens,
    required this.strings,
    required this.state,
    required this.mode,
    required this.modes,
    required this.onMode,
    required this.colorScheme,
    required this.onColorScheme,
    required this.onCommand,
    required this.finding,
    required this.onFind,
    required this.onOpen,
  });

  final List<MawyEditorToolbarItem> items;
  final MawyTokens tokens;
  final MawyStrings strings;
  final EditState state;
  final MawyEditorMode mode;
  final List<MawyEditorMode> modes;
  final ValueChanged<MawyEditorMode> onMode;
  final MawyColorScheme colorScheme;
  final ValueChanged<MawyColorScheme>? onColorScheme;
  final ValueChanged<MawyCommand>? onCommand;
  final bool finding;
  final VoidCallback? onFind;
  final VoidCallback? onOpen;

  @override
  State<_Toolbar> createState() => _ToolbarState();
}

class _ToolbarState extends State<_Toolbar> {
  final MawyRoving _roving = MawyRoving();

  @override
  void dispose() {
    _roving.dispose();
    super.dispose();
  }

  static const Map<MawyEditorToolbarItem, MawyCommand> _commands =
      <MawyEditorToolbarItem, MawyCommand>{
        MawyEditorToolbarItem.bold: MawyCommand.bold,
        MawyEditorToolbarItem.italic: MawyCommand.italic,
        MawyEditorToolbarItem.strikethrough: MawyCommand.strikethrough,
        MawyEditorToolbarItem.code: MawyCommand.code,
        MawyEditorToolbarItem.link: MawyCommand.link,
        MawyEditorToolbarItem.image: MawyCommand.image,
        MawyEditorToolbarItem.quote: MawyCommand.quote,
        MawyEditorToolbarItem.bulletList: MawyCommand.bulletList,
        MawyEditorToolbarItem.orderedList: MawyCommand.orderedList,
        MawyEditorToolbarItem.taskList: MawyCommand.taskList,
        MawyEditorToolbarItem.codeBlock: MawyCommand.codeBlock,
        MawyEditorToolbarItem.rule: MawyCommand.rule,
      };

  static const Map<MawyEditorToolbarItem, IconData> _icons = <MawyEditorToolbarItem, IconData>{
    MawyEditorToolbarItem.bold: LucideIcons.bold,
    MawyEditorToolbarItem.italic: LucideIcons.italic,
    MawyEditorToolbarItem.strikethrough: LucideIcons.strikethrough,
    MawyEditorToolbarItem.code: LucideIcons.code,
    MawyEditorToolbarItem.link: LucideIcons.link,
    MawyEditorToolbarItem.image: LucideIcons.image,
    MawyEditorToolbarItem.quote: LucideIcons.textQuote,
    MawyEditorToolbarItem.bulletList: LucideIcons.list,
    MawyEditorToolbarItem.orderedList: LucideIcons.listOrdered,
    MawyEditorToolbarItem.taskList: LucideIcons.listChecks,
    MawyEditorToolbarItem.codeBlock: LucideIcons.braces,
    MawyEditorToolbarItem.rule: LucideIcons.minus,
  };

  String _labelFor(MawyEditorToolbarItem item) => switch (item) {
    MawyEditorToolbarItem.bold => widget.strings.bold,
    MawyEditorToolbarItem.italic => widget.strings.italic,
    MawyEditorToolbarItem.strikethrough => widget.strings.strikethrough,
    MawyEditorToolbarItem.code => widget.strings.codeSpan,
    MawyEditorToolbarItem.link => widget.strings.link,
    MawyEditorToolbarItem.image => widget.strings.image,
    MawyEditorToolbarItem.quote => widget.strings.quote,
    MawyEditorToolbarItem.bulletList => widget.strings.bulletList,
    MawyEditorToolbarItem.orderedList => widget.strings.orderedList,
    MawyEditorToolbarItem.taskList => widget.strings.taskList,
    MawyEditorToolbarItem.codeBlock => widget.strings.codeBlock,
    MawyEditorToolbarItem.rule => widget.strings.thematicBreak,
    _ => '',
  };

  String _modeLabel(MawyEditorMode value) => switch (value) {
    MawyEditorMode.plain => widget.strings.modePlain,
    MawyEditorMode.split => widget.strings.modeSplit,
    MawyEditorMode.preview => widget.strings.modePreview,
  };

  IconData _modeIcon(MawyEditorMode value) => switch (value) {
    MawyEditorMode.plain => LucideIcons.pencilLine,
    MawyEditorMode.split => LucideIcons.columns2,
    MawyEditorMode.preview => LucideIcons.eye,
  };

  @override
  Widget build(BuildContext context) {
    final List<Widget> children = <Widget>[];

    // The row's places, counted over the controls: a separator is drawn and is
    // not one of them, and an item like `mode` is several.
    int stop = 0;

    FocusNode next() {
      final FocusNode node = _roving.nodeFor(stop);

      stop += 1;

      return node;
    }

    for (final MawyEditorToolbarItem item in widget.items) {
      if (item == MawyEditorToolbarItem.separator) {
        children.add(
          Container(
            width: 1,
            height: 18,
            margin: const EdgeInsets.symmetric(horizontal: 5),
            color: widget.tokens.border,
          ),
        );
        continue;
      }

      if (item == MawyEditorToolbarItem.mode) {
        for (final MawyEditorMode option in widget.modes) {
          children.add(
            MawyToolbarButton(
              icon: _modeIcon(option),
              label: _modeLabel(option),
              tokens: widget.tokens,
              focusNode: next(),
              pressed: option == widget.mode,
              onPressed: () => widget.onMode(option),
            ),
          );
        }

        continue;
      }

      if (item == MawyEditorToolbarItem.find) {
        // Not drawn where there is no source to search: `preview` is a viewer,
        // and a control that cannot do anything is one nobody should reach.
        if (widget.onFind == null) {
          continue;
        }

        children.add(
          MawyToolbarButton(
            icon: LucideIcons.search,
            label: widget.strings.find,
            tokens: widget.tokens,
            focusNode: next(),
            pressed: widget.finding,
            onPressed: widget.onFind!,
          ),
        );

        continue;
      }

      if (item == MawyEditorToolbarItem.open) {
        // Not drawn where the application has no answer: a file picker is a
        // plugin, and a button that cannot open anything is one nobody should
        // reach.
        if (widget.onOpen == null) {
          continue;
        }

        children.add(
          MawyToolbarButton(
            icon: LucideIcons.folderOpen,
            label: widget.strings.openFile,
            tokens: widget.tokens,
            focusNode: next(),
            onPressed: widget.onOpen!,
          ),
        );

        continue;
      }

      if (item == MawyEditorToolbarItem.colorScheme) {
        if (widget.onColorScheme == null) {
          continue;
        }

        // A menu rather than a button that cycles, which is what the viewer's
        // toolbar and the React package's both do. Three values is already one
        // too many to press through to reach the one you want, and the list
        // will be longer than three the first time this library ships a palette
        // that is neither light nor dark.
        children.add(
          MawyToolbarMenu(
            icon: switch (widget.colorScheme) {
              MawyColorScheme.light => LucideIcons.sun,
              MawyColorScheme.dark => LucideIcons.moon,
              MawyColorScheme.system => LucideIcons.sunMoon,
            },
            label: widget.strings.colorScheme,
            tokens: widget.tokens,
            focusNode: next(),
            builder: (VoidCallback close) => MawyToolbarChoice<MawyColorScheme>(
              tokens: widget.tokens,
              value: widget.colorScheme,
              options: MawyToolbarSchemes.of(widget.strings),
              onChanged: (MawyColorScheme next) {
                widget.onColorScheme!(next);
                close();
              },
            ),
          ),
        );

        continue;
      }

      if (item == MawyEditorToolbarItem.heading) {
        // One menu rather than three buttons, which is what the React
        // package's toolbar does: the three levels and body text are four
        // answers to one question, and four buttons in a row is four questions.
        const List<MawyCommand> levels = <MawyCommand>[
          MawyCommand.heading1,
          MawyCommand.heading2,
          MawyCommand.heading3,
        ];

        children.add(
          MawyToolbarMenu(
            icon: LucideIcons.heading,
            label: widget.strings.heading,
            tokens: widget.tokens,
            focusNode: next(),
            builder: (VoidCallback close) => MawyToolbarChoice<MawyCommand>(
              tokens: widget.tokens,
              value: levels.firstWhere(
                (MawyCommand level) => commandActive(level, widget.state),
                orElse: () => MawyCommand.paragraph,
              ),
              options: <MawyToolbarOption<MawyCommand>>[
                MawyToolbarOption<MawyCommand>(
                  MawyCommand.heading1,
                  widget.strings.heading1,
                  icon: LucideIcons.heading1,
                ),
                MawyToolbarOption<MawyCommand>(
                  MawyCommand.heading2,
                  widget.strings.heading2,
                  icon: LucideIcons.heading2,
                ),
                MawyToolbarOption<MawyCommand>(
                  MawyCommand.heading3,
                  widget.strings.heading3,
                  icon: LucideIcons.heading3,
                ),
                MawyToolbarOption<MawyCommand>(
                  MawyCommand.paragraph,
                  widget.strings.paragraph,
                  icon: LucideIcons.pilcrow,
                ),
              ],
              onChanged: (MawyCommand chosen) {
                widget.onCommand?.call(chosen);
                close();
              },
            ),
          ),
        );

        continue;
      }

      final MawyCommand? command = _commands[item];

      if (command == null) {
        continue;
      }

      children.add(
        MawyToolbarButton(
          icon: _icons[item]!,
          label: _labelFor(item),
          tokens: widget.tokens,
          focusNode: next(),
          pressed: commandActive(command, widget.state),
          onPressed: () => widget.onCommand?.call(command),
        ),
      );
    }

    return Container(
      constraints: const BoxConstraints(minHeight: 44),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: widget.tokens.chrome,
        border: Border(bottom: BorderSide(color: widget.tokens.border)),
      ),
      child: Semantics(
        container: true,
        label: widget.strings.toolbar,
        child: MawyRovingRow(
          roving: _roving,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: children),
          ),
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------
 * No document yet
 * ---------------------------------------------------------------------- */

/// What the preview is when there is nothing to preview.
///
/// Not an error and not a blank rectangle: an editor holding nothing is a place
/// to bring a document to, so the empty state is the way in. It is drawn here
/// rather than in the viewer because what opening one *means* is the editor's
/// argument — see [MawyEditor.onOpen].
class _Empty extends StatelessWidget {
  const _Empty({required this.tokens, required this.strings, required this.onOpen});

  final MawyTokens tokens;
  final MawyStrings strings;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: tokens.background,
      padding: const EdgeInsets.all(28),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: tokens.backgroundSunken,
              borderRadius: BorderRadius.circular(MawyRadius.large),
            ),
            child: Icon(LucideIcons.fileText, size: 22, color: tokens.foregroundSubtle),
          ),
          const SizedBox(height: 14),
          Text(
            strings.emptyTitle,
            textAlign: TextAlign.center,
            style: TextStyle(color: tokens.foreground, fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            strings.emptyHint,
            textAlign: TextAlign.center,
            style: TextStyle(color: tokens.foregroundMuted, fontSize: 13),
          ),
          const SizedBox(height: 14),
          _EmptyAction(tokens: tokens, label: strings.emptyAction, onPressed: onOpen),
        ],
      ),
    );
  }
}

/// The button under it. A word in a box, which is what the stylesheet's is.
class _EmptyAction extends StatefulWidget {
  const _EmptyAction({required this.tokens, required this.label, required this.onPressed});

  final MawyTokens tokens;
  final String label;
  final VoidCallback onPressed;

  @override
  State<_EmptyAction> createState() => _EmptyActionState();
}

class _EmptyActionState extends State<_EmptyAction> {
  bool _hovered = false;
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;

    return Semantics(
      button: true,
      label: widget.label,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        shortcuts: mawyActivate,
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (ActivateIntent _) {
              widget.onPressed();

              return null;
            },
          ),
        },
        onShowHoverHighlight: (bool on) => setState(() => _hovered = on),
        onShowFocusHighlight: (bool on) => setState(() => _focused = on && MawyFocusVisible.wanted),
        child: GestureDetector(
          onTap: widget.onPressed,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _hovered ? tokens.backgroundSunken : tokens.background,
              borderRadius: BorderRadius.circular(MawyRadius.medium),
              border: Border.all(color: _hovered ? tokens.borderStrong : tokens.border),
            ),
            foregroundDecoration: _focused
                ? BoxDecoration(
                    borderRadius: BorderRadius.circular(MawyRadius.medium),
                    border: Border.all(color: tokens.accent, width: 2),
                  )
                : null,
            child: ExcludeSemantics(
              child: Text(
                widget.label,
                style: TextStyle(
                  color: tokens.foreground,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------
 * The status bar
 * ---------------------------------------------------------------------- */

class _Status extends StatelessWidget {
  const _Status({
    required this.items,
    required this.tokens,
    required this.strings,
    required this.state,
  });

  final List<MawyEditorStatusItem> items;
  final MawyTokens tokens;
  final MawyStrings strings;
  final EditState state;

  static String _size(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    }

    final double kilobytes = bytes / 1024;

    return kilobytes < 1024
        ? '${(kilobytes * 10).round() / 10} KB'
        : '${(kilobytes / 1024 * 100).round() / 100} MB';
  }

  @override
  Widget build(BuildContext context) {
    final MawyCaretAt at = caretAt(state.value, state.start, state.end);
    final List<String> cells = <String>[];

    for (final MawyEditorStatusItem item in items) {
      switch (item) {
        case MawyEditorStatusItem.position:
          cells.add(
            strings.statusPosition.replaceAll('%L', '${at.line}').replaceAll('%C', '${at.column}'),
          );
        case MawyEditorStatusItem.selection:
          if (at.selected > 0) {
            cells.add(strings.statusSelected.replaceAll('%N', '${at.selected}'));
          }
        case MawyEditorStatusItem.lines:
          cells.add('${countLines(state.value)} ${strings.statusLines}');
        case MawyEditorStatusItem.words:
          cells.add('${countWords(state.value)} ${strings.statusWords}');
        case MawyEditorStatusItem.characters:
          cells.add('${countCharacters(state.value)} ${strings.statusCharacters}');
        case MawyEditorStatusItem.size:
          cells.add(_size(countBytes(state.value)));
      }
    }

    return Semantics(
      container: true,
      label: strings.status,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
        decoration: BoxDecoration(
          color: tokens.chrome,
          border: Border(top: BorderSide(color: tokens.border)),
        ),
        child: Wrap(
          spacing: 14,
          runSpacing: 4,
          // Down the middle of the row, and every cell on the same line as every
          // other. Both halves of that are needed: a forced strut makes every
          // cell the same height, and even leading puts the baseline in the same
          // place inside it whichever font the cell was drawn from — which is
          // what the size, the one cell with no Hangul in it, did not have.
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            for (final String cell in cells)
              Text(
                cell,
                strutStyle: const StrutStyle(
                  fontSize: 12,
                  height: 1.35,
                  forceStrutHeight: true,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
                style: TextStyle(
                  color: tokens.foregroundSubtle,
                  fontSize: 12,
                  height: 1.35,
                  fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// `Mod`+`F`.
class _FindIntent extends Intent {
  const _FindIntent();
}

/// How far the bar between the panes of `split` may be pushed, either way.
const double _splitLeast = 0.15;
const double _splitMost = 0.85;

double _clampShare(double value) => value.clamp(_splitLeast, _splitMost);

String _percent(double share) => '${(share * 100).round()}%';

/// The bar between the two panes of `split`, which is something to take hold of.
///
/// One pixel of line and five of target: the line is the border the two panes
/// would have had anyway, and the rest is the width a pointer needs to find it.
/// The React package's bar is the same five pixels over the same one, and for
/// the same reason.
///
/// It is a `Semantics` slider rather than a button, which is what it is: a value
/// between two ends that the arrows move. A bar nobody can move without a
/// pointer is a bar half the readers of this editor cannot move at all, so the
/// arrows are here and `Enter` puts it back to half.
class _Divider extends StatefulWidget {
  const _Divider({
    required this.tokens,
    required this.strings,
    required this.share,
    required this.width,
    required this.onChange,
  });

  final MawyTokens tokens;
  final MawyStrings strings;
  final double share;

  /// How wide the two panes are together, which is what a drag is measured in.
  final double width;

  final ValueChanged<double> onChange;

  @override
  State<_Divider> createState() => _DividerState();
}

class _DividerState extends State<_Divider> {
  // The keys are handled on the node itself rather than on a `Focus` inside
  // the detector: a key event travels from the node that has the focus up
  // through its ancestors, and a `Focus` under the detector is not one of them.
  late final FocusNode _node = FocusNode(debugLabel: 'MawyEditor divider', onKeyEvent: _onKey);

  bool _hovered = false;
  bool _focused = false;

  @override
  void dispose() {
    _node.dispose();
    super.dispose();
  }

  void _by(double step) => widget.onChange(widget.share + step);

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }

    final bool far = HardwareKeyboard.instance.isShiftPressed;
    final bool rtl = Directionality.of(context) == TextDirection.rtl;
    final double step = (far ? 0.1 : 0.02) * (rtl ? -1 : 1);

    switch (event.logicalKey) {
      case LogicalKeyboardKey.arrowLeft:
        _by(-step);
      case LogicalKeyboardKey.arrowRight:
        _by(step);
      case LogicalKeyboardKey.home:
        widget.onChange(rtl ? _splitMost : _splitLeast);
      case LogicalKeyboardKey.end:
        widget.onChange(rtl ? _splitLeast : _splitMost);
      case LogicalKeyboardKey.enter:
      case LogicalKeyboardKey.numpadEnter:
        widget.onChange(0.5);
      default:
        return KeyEventResult.ignored;
    }

    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final bool lit = _hovered || _focused;

    return Semantics(
      slider: true,
      label: widget.strings.divider,
      value: _percent(widget.share),
      // Both of these, or neither: a node that says it can be increased and
      // does not say what to has an assertion of Flutter's waiting for it.
      increasedValue: _percent(_clampShare(widget.share + 0.02)),
      decreasedValue: _percent(_clampShare(widget.share - 0.02)),
      onIncrease: () => _by(0.02),
      onDecrease: () => _by(-0.02),
      child: FocusableActionDetector(
        focusNode: _node,
        mouseCursor: SystemMouseCursors.resizeColumn,
        onShowHoverHighlight: (bool on) => setState(() => _hovered = on),
        onShowFocusHighlight: (bool on) => setState(() => _focused = on),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          // Taking hold of the bar is asking for it, and the arrows are no
          // use to somebody who has to press Tab to reach what they are
          // already pointing at.
          onTapDown: (TapDownDetails _) => _node.requestFocus(),
          onHorizontalDragDown: (DragDownDetails _) => _node.requestFocus(),
          onHorizontalDragUpdate: (DragUpdateDetails drag) {
            if (widget.width <= 0) {
              return;
            }

            final bool rtl = Directionality.of(context) == TextDirection.rtl;
            final double along = drag.delta.dx * (rtl ? -1 : 1);

            widget.onChange(widget.share + along / widget.width);
          },
          onDoubleTap: () => widget.onChange(0.5),
          child: SizedBox(
            width: 5,
            child: Center(
              child: AnimatedContainer(
                duration: MawyMotion.durationOf(context),
                curve: MawyMotion.easing,
                width: lit ? 3 : 1,
                color: lit ? tokens.accent : tokens.border,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
