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
import 'package:mawy/src/internal/table_tools.dart';
import 'package:mawy/src/internal/toolbar.dart';
import 'package:mawy/src/markdown/ast.dart' show MdRange;
import 'package:mawy/src/markdown/parse.dart' show MawyParseOptions;
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';
import 'package:mawy/src/viewer/anchors.dart';
import 'package:mawy/src/viewer/mawy_viewer.dart';

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

  /// A step back through the history of the source.
  ///
  /// Drawn disabled while there is nothing to take back, while the document is
  /// read only, and in `preview`, where there is no source to take it back in.
  /// The history is the source field's own, which is Flutter's; see [MawyEditor].
  undo,

  /// A step forward again, drawn disabled while there is nothing to put back.
  redo,

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

  /// The heading levels in [MawyEditor.headingLevels], and body text.
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

  /// A menu that inserts a table and adds or removes its rows and columns.
  ///
  /// Each entry has a key as well, and each is drawn disabled where it has
  /// nothing to act on: a row cannot go above the header, the last column
  /// cannot be removed, and everything but inserting one wants the caret in a
  /// table.
  table,

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
  MawyEditorToolbarItem.undo,
  MawyEditorToolbarItem.redo,
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
  MawyEditorToolbarItem.table,
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

/// What an application can do to an editor from outside it.
///
/// Made by the application and handed to [MawyEditor.handle], the way a
/// `ScrollController` is handed to a scroll view. A button beside the editor
/// that inserts a snippet, or a screen putting the focus back in the editor
/// after a dialog closes, has no other way in. Before an editor has it, and
/// after that editor is gone, both methods do nothing.
///
/// ```dart
/// final MawyEditorHandle handle = MawyEditorHandle();
///
/// MawyEditor(handle: handle, onChange: save);
/// TextButton(onPressed: () => handle.insert('![](https://example.com/a.png)'), child: ...);
/// ```
class MawyEditorHandle {
  /// Creates a handle that belongs to no editor yet.
  MawyEditorHandle();

  _MawyEditorState? _editor;

  /// The focus put back in the source, with the caret where it was left.
  ///
  /// Nothing in `preview`, which has no caret.
  void focus() => _editor?._focusFromOutside();

  /// [markdown] written where the caret is, in place of whatever is selected,
  /// as one change, with the caret after it and the focus in the source.
  ///
  /// A caret nobody has put anywhere yet is at the end of the document. Nothing
  /// while the editor is read only or in `preview`.
  void insert(String markdown) => _editor?._insertFromOutside(markdown);
}

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
    this.headingLevels = const <int>[1, 2, 3],
    this.frame = MawyFrame.box,
    this.toolbarPlacement = MawyToolbarPlacement.top,
    this.status = kMawyEditorStatus,
    this.parse = const MawyParseOptions(),
    this.colorScheme,
    this.defaultColorScheme = MawyColorScheme.system,
    this.onColorSchemeChange,
    this.tokens,
    this.typography,
    this.defaultTypography = const MawyTypography(),
    this.locale = MawyLocale.en,
    this.strings,
    this.directives,
    this.highlight,
    this.onLinkTap,
    this.links = MawyLinkPolicy.show,
    this.images = MawyImagePolicy.show,
    this.resolveUrl,
    this.readOnly = false,
    this.onOpen,
    this.lineNumbers = true,
    this.placeholder,
    this.handle,
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

  /// Which headings the `heading` menu offers, as the number of `#` each is
  /// written with, in the order the menu lists them.
  ///
  /// For an application whose screens write the title themselves and whose
  /// documents start at `##`: `const [2, 3, 4]` offers those three and body
  /// text, and `Mod`+`2` to `Mod`+`4` toggle them, while `Mod`+`1` is handed on
  /// to whatever else answers it. The keys reach only what the menu offers, so
  /// the two cannot disagree. A number outside one to six is left out.
  final List<int> headingLevels;

  /// Whether the editor has a frame around it, or floats on the screen.
  ///
  /// [MawyFrame.box] is a surface with a background of its own and the toolbar
  /// barred across one end, which is what an editor usually wants: somebody
  /// typing can see where the thing they are typing into starts and the screen
  /// stops. [MawyFrame.floating] gives that up and puts the toolbar over the
  /// document as a rounded bar. See [MawyFrame].
  ///
  /// The status line is not a toolbar and does not move. It is the bottom edge
  /// of the editor either way, and a floating bar at the bottom hangs from the
  /// document rather than from the editor so the two do not sit on top of each
  /// other.
  final MawyFrame frame;

  /// Which end of the editor the toolbar is at, and with it the find bar. The
  /// status line stays where it is.
  final MawyToolbarPlacement toolbarPlacement;

  /// The counts to show along the bottom. `const []` for none.
  final List<MawyEditorStatusItem> status;

  /// How the Markdown is read.
  final MawyParseOptions parse;

  /// Which palette to draw in, where the application decides.
  ///
  /// The pair `mode`/`defaultMode` and `typography`/`defaultTypography` make,
  /// and for the same reason: pass this and the application owns the answer —
  /// the toolbar reports what the reader picked through [onColorSchemeChange]
  /// and changes nothing until the application hands back a new value. Pass
  /// nothing and the editor keeps it, and still reports every change.
  final MawyColorScheme? colorScheme;

  /// Which palette to draw in when the editor decides for itself.
  final MawyColorScheme defaultColorScheme;

  /// Called when the reader picks a different one. Called either way, so an
  /// application can watch a value it is not driving.
  final ValueChanged<MawyColorScheme>? onColorSchemeChange;

  /// The colours to draw in. See [MawyViewer.tokens], which this is passed to.
  final MawyTokensBuilder? tokens;

  /// How the preview is set, where the application decides.
  final MawyTypography? typography;

  /// How it is set when the editor decides for itself.
  final MawyTypography defaultTypography;

  /// The language the editor's own interface is written in.
  final MawyLocale locale;

  /// The words the interface says, where the application has its own.
  ///
  /// Start from a locale's and change what differs, which is the only way to
  /// make a set: `MawyStrings.of(MawyLocale.en).copyWith(bold: t.bold)`. Given,
  /// it is every word, [locale] says nothing, and the preview is handed the
  /// same set. A new set with the same words in it on every build redraws
  /// nothing: the words are compared, not the object. See [MawyStrings].
  final MawyStrings? strings;

  /// What draws the constructs this package does not know about, in the
  /// preview.
  final Map<String, MawyDirectiveBuilder>? directives;

  /// What colours a code block in the preview. See [MawyViewer.highlight].
  final MawyHighlighter? highlight;

  /// What tapping a link in the preview does.
  final void Function(String url, String? title)? onLinkTap;

  /// How a link the document wrote is drawn in the preview. The source pane is
  /// the document's characters and is not changed. See [MawyLinkPolicy].
  final MawyLinkPolicy links;

  /// How a picture the document asks for is drawn in the preview. See
  /// [MawyImagePolicy].
  final MawyImagePolicy images;

  /// Where a relative URL points. See [MawyUrlResolver].
  ///
  /// A URL written in a document is relative to the document, and the pane
  /// drawing it is somewhere else — so the preview resolves the document's
  /// addresses the same way a viewer does.
  final MawyUrlResolver? resolveUrl;

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

  /// What lets an application insert at the caret and put the focus back from
  /// a control of its own. See [MawyEditorHandle].
  final MawyEditorHandle? handle;

  @override
  State<MawyEditor> createState() => _MawyEditorState();
}

class _MawyEditorState extends State<MawyEditor> {
  late final MawySourceController _controller = MawySourceController(
    text: widget.value ?? widget.defaultValue,
  );
  final FocusNode _focus = FocusNode();

  /// The source field's history, held here so the toolbar can read it and walk
  /// it. It is still the field's: Flutter keeps it and decides what a step is.
  final UndoHistoryController _history = UndoHistoryController();

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
  late MawyColorScheme _held = widget.colorScheme ?? widget.defaultColorScheme;
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

  /// The preview, kept as the same widget while nothing it draws from changes.
  ///
  /// A caret that only moved is still a rebuild here — the status bar counts
  /// the selection and every toolbar button reads it — and a child handed a
  /// *new* widget rebuilds even when every field on it is the same as the last
  /// one's. Handed the same object it does not rebuild at all, so moving the
  /// caret through a long document stops redrawing the document beside it.
  Widget? _preview;
  Object? _previewFrom;

  /// What the pane beside the source is, this build.
  ///
  /// A document with nothing in it draws nothing, and a pane drawing nothing
  /// beside an empty editor is a rectangle that says less than a sentence
  /// would. Where the application knows how to open one, this is the way in —
  /// the React package's empty state, in the pane the document will appear in.
  Widget _previewOf(MawyTokens tokens, MawyStrings strings) {
    final bool empty = _value.trim().isEmpty && widget.onOpen != null && !widget.readOnly;
    // Everything either branch draws from. Anything left out of this is
    // something the preview would go stale about, so it is written out in full
    // rather than narrowed to what seems likely to change.
    final Object from = (
      empty,
      _value,
      tokens,
      strings,
      widget.parse,
      _scheme,
      widget.tokens,
      _type,
      widget.locale,
      widget.directives,
      widget.highlight,
      widget.onLinkTap,
      widget.links,
      widget.images,
      widget.resolveUrl,
      widget.onOpen,
      widget.readOnly,
    );

    if (_preview != null && _previewFrom == from) {
      return _preview!;
    }

    _previewFrom = from;
    _preview = empty
        ? _Empty(tokens: tokens, strings: strings, onOpen: widget.onOpen!)
        : MawyViewer(
            value: _value,
            parse: widget.parse,
            colorScheme: _scheme,
            tokens: widget.tokens,
            typography: _type,
            toolbar: const <MawyViewerToolbarItem>[],
            locale: widget.locale,
            strings: strings,
            directives: widget.directives,
            highlight: widget.highlight,
            onLinkTap: widget.onLinkTap,
            links: widget.links,
            images: widget.images,
            resolveUrl: widget.resolveUrl,
            scrollController: _previewScroll,
            // Where each block of the drawn document ended up, which is half of
            // what lines the two panes up. See `_syncScroll`.
            anchors: _anchors,
          );

    return _preview!;
  }

  String get _value => _controller.text;
  MawyEditorMode get _current => widget.mode ?? _mode;

  @override
  void initState() {
    super.initState();
    _lastReported = _controller.text;
    widget.handle?._editor = this;
    _controller.addListener(_changed);
    _history.addListener(_historyMoved);
    _sourceScroll.addListener(_syncScroll);
  }

  @override
  void didUpdateWidget(MawyEditor old) {
    super.didUpdateWidget(old);

    if (old.handle != widget.handle) {
      _let(old.handle);
      widget.handle?._editor = this;
    }

    if (widget.value != null && widget.value != _controller.text) {
      final String text = widget.value!;
      final TextSelection was = _controller.selection;

      // Where the caret was, kept. An application holding `value` and handing
      // back something a little different — trimmed, normalised, arrived from
      // the server — used to move the caret to the end of the document on
      // every keystroke, which in a long file is the writer's place lost.
      // Clamped rather than trusted, since the new text may be shorter.
      _lastReported = text;
      _controller.value = _controller.value.copyWith(
        text: text,
        selection: was.isValid
            ? TextSelection(
                baseOffset: was.baseOffset.clamp(0, text.length),
                extentOffset: was.extentOffset.clamp(0, text.length),
              )
            : TextSelection.collapsed(offset: text.length),
        composing: TextRange.empty,
      );
    }

    if (widget.typography != null && widget.typography != old.typography) {
      _type = widget.typography!;
    }
  }

  @override
  void dispose() {
    _let(widget.handle);
    _controller.removeListener(_changed);
    _controller.dispose();
    _focus.dispose();
    _history.removeListener(_historyMoved);
    _history.dispose();
    _sourceScroll.removeListener(_syncScroll);
    _sourceScroll.dispose();
    _previewScroll.dispose();
    super.dispose();
  }

  /// The document as the application last saw it.
  ///
  /// The document it *started* with rather than nothing, because the controller
  /// says something whenever the caret moves as well as whenever the text does
  /// — so an editor given a document and then clicked in once reported that
  /// document as a change nobody had made.
  ///
  /// Filled in `initState` rather than here: a `late` field is filled the first
  /// time it is read, and the first time this one is read is the first change,
  /// which would make that change the thing it starts out equal to.
  late String _lastReported;

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

  /// Lets a handle go, where it is still this editor's. A handle passed on to
  /// another editor in the same frame is that editor's by now.
  void _let(MawyEditorHandle? handle) {
    if (handle?._editor == this) {
      handle!._editor = null;
    }
  }

  void _focusFromOutside() {
    if (_current != MawyEditorMode.preview) {
      _focus.requestFocus();
    }
  }

  void _insertFromOutside(String markdown) {
    if (widget.readOnly || _current == MawyEditorMode.preview || markdown.isEmpty) {
      return;
    }

    final EditState before = _state;
    final int at = before.start + markdown.length;

    _apply(
      EditState(
        before.value.substring(0, before.start) + markdown + before.value.substring(before.end),
        at,
        at,
      ),
    );
  }

  /// Whether there is a step to take back or put back changed, which the field
  /// says a moment after the text changed rather than with it.
  void _historyMoved() {
    if (mounted) {
      setState(() {});
    }
  }

  /// A step through the history, from the toolbar, with the focus back in the
  /// source so the caret shows where it happened — which is what every other
  /// button there does.
  void _travel({required bool back}) {
    if (back) {
      _history.undo();
    } else {
      _history.redo();
    }

    _focus.requestFocus();
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

  /// The heading levels the menu and the keys offer, with anything that is not
  /// one of the six left out.
  List<int> get _headingLevels =>
      widget.headingLevels.where((int depth) => depth >= 1 && depth <= 6).toList();

  /// A heading of this depth on the lines the selection touches, or off them;
  /// `0` is body text.
  void _heading(int depth) {
    if (!widget.readOnly) {
      _apply(toggleHeading(_state, depth));
    }
  }

  /// A table command, where it has something to act on.
  void _runTable(MawyTableCommand command) {
    final EditState? after = runTableCommand(command, _state);

    if (after != null) {
      _apply(after);
    }
  }

  /// An empty table of the size the toolbar's grid was pressed at.
  void _insertTableSized(int columns, int rows) {
    final EditState? after = widget.readOnly || !widget.parse.gfm
        ? null
        : tableOfSize(_state, columns, rows);

    if (after != null) {
      _apply(after);
    }
  }

  /// Whether a table command has anything to act on where the caret is, which
  /// is a parse of the document and so is asked when the menu opens or the key
  /// is pressed rather than on every build.
  bool _tableAvailable(MawyTableCommand command) =>
      !widget.readOnly &&
      _current != MawyEditorMode.preview &&
      runTableCommand(command, _state) != null;

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

  /// The palette in force: the application's answer where there is one, and
  /// the editor's own otherwise.
  MawyColorScheme get _scheme => widget.colorScheme ?? _held;

  void _setScheme(MawyColorScheme scheme) {
    widget.onColorSchemeChange?.call(scheme);

    // Only where the application is not holding one. A value it is driving
    // changes when it says so and not before, which is what makes it worth
    // driving.
    if (widget.colorScheme == null) {
      setState(() => _held = scheme);
    }
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
    final MawyStrings strings = widget.strings ?? stringsFor(widget.locale);
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
      onTable: _runTable,
      tableAvailable: _tableAvailable,
      headingLevels: _headingLevels,
      onHeading: widget.readOnly ? null : _heading,
      undoController: _history,
      scrollController: _sourceScroll,
      editableKey: _editable,
      lineNumbers: widget.lineNumbers,
      matches: matches,
      currentMatch: _currentMatch(matches),
    );

    final Widget tabled = _TableToolsHost(
      controller: _controller,
      focus: _focus,
      scroll: _sourceScroll,
      editableKey: _editable,
      active: !widget.readOnly && widget.parse.gfm,
      tokens: tokens,
      strings: strings,
      available: _tableAvailable,
      onCommand: _runTable,
      child: source,
    );

    final Widget preview = _previewOf(tokens, strings);

    final bool floating = widget.frame == MawyFrame.floating;

    // The toolbar and the find bar, which travel together. Both move to the
    // other end under `bottom`, and both come out of the column to hover over
    // the document under `floating` — a find bar at one end with its toolbar at
    // the other is a bar belonging to nothing. The status line is not in here
    // and does not move: a count of words is not a control.
    final List<Widget> chrome = <Widget>[
      if (widget.toolbar.isNotEmpty)
        _Toolbar(
          frame: widget.frame,
          placement: widget.toolbarPlacement,
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
          canUndo: showSource && !widget.readOnly && _history.value.canUndo,
          canRedo: showSource && !widget.readOnly && _history.value.canRedo,
          onTravel: _travel,
          editable: showSource && !widget.readOnly,
          inTable: showSource && tableRangeAt(_value, _state.start) != null,
          onInsertTable: _insertTableSized,
          tableAvailable: _tableAvailable,
          headingLevels: _headingLevels,
          onHeading: _heading,
          finding: _finding && showSource,
          onFind: showSource ? _openFind : null,
          onOpen: widget.readOnly ? null : widget.onOpen,
        ),
      if (_finding && showSource)
        MawyFindBar(
          frame: widget.frame,
          placement: widget.toolbarPlacement,
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
    ];

    // The toolbar is the one against the edge and the find bar is on the inside
    // of it, which is why the two swap under `bottom`. Put the other way round,
    // a floating group anchored to the bottom would push its own toolbar up the
    // moment the find bar opened — the toolbar would move under the finger that
    // had just pressed it.
    if (widget.toolbarPlacement == MawyToolbarPlacement.bottom) {
      chrome.setAll(0, chrome.reversed.toList());
    }

    final Widget panes = Expanded(
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints room) => Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            if (showSource)
              // A flex of a thousandth, so the share is a whole number of
              // them and the two panes always add up to the width. A
              // fractional `flex` is not a thing a `Row` has.
              Flexible(flex: (_share * 1000).round(), child: tabled),
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
              Flexible(flex: showSource ? 1000 - (_share * 1000).round() : 1000, child: preview),
          ],
        ),
      ),
    );

    final Widget editor = Container(
      // The ground is not part of the frame. `floating` gives up the border,
      // the bar across the end and the room around the prose, and keeps this —
      // a palette that reaches the text and not what it sits on is half a
      // palette, and a reader who picks dark gets light grey on white. An
      // application that means to have the document sit on its own ground says
      // so with the tokens it already passes:
      //
      //     tokens: MawyTokens.of(brightness).copyWith(background: Colors.transparent)
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
            if (!floating && widget.toolbarPlacement == MawyToolbarPlacement.top) ...chrome,
            if (floating)
              // Hung from the panes rather than from the editor, so a bar at
              // the bottom sits over the last line of the document instead of
              // over the status line.
              Expanded(
                child: Stack(
                  children: <Widget>[
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[panes],
                    ),
                    if (chrome.isNotEmpty)
                      Positioned(
                        left: 0,
                        right: 0,
                        top: widget.toolbarPlacement == MawyToolbarPlacement.top ? 0 : null,
                        bottom: widget.toolbarPlacement == MawyToolbarPlacement.bottom ? 0 : null,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            spacing: 8,
                            children: chrome,
                          ),
                        ),
                      ),
                  ],
                ),
              )
            else
              panes,
            if (!floating && widget.toolbarPlacement == MawyToolbarPlacement.bottom) ...chrome,
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

  /// `Tab` and `Shift`+`Tab`: the next cell or the one before in a table, and
  /// indentation everywhere else. See [nextCell].
  void _indent({required bool out}) =>
      _apply(nextCell(_state, back: out) ?? indent(_state, out: out));
}

/* -------------------------------------------------------------------------
 * A table's own controls
 * ---------------------------------------------------------------------- */

/// The source, with the row and column controls hung beside the table the caret
/// is in.
///
/// Over the line the table starts on, at the far end of the field, and under
/// the line it ends on where there is no room above; never out of the field.
/// Only while the source has the focus and can be changed: the controls are for
/// the table being written in. Placed after the frame the caret moved in, since
/// where a line is drawn is only known once the field has laid it out, and again
/// whenever the field scrolls.
class _TableToolsHost extends StatefulWidget {
  const _TableToolsHost({
    required this.controller,
    required this.focus,
    required this.scroll,
    required this.editableKey,
    required this.active,
    required this.tokens,
    required this.strings,
    required this.available,
    required this.onCommand,
    required this.child,
  });

  final TextEditingController controller;
  final FocusNode focus;
  final ScrollController scroll;
  final GlobalKey<EditableTextState> editableKey;
  final bool active;
  final MawyTokens tokens;
  final MawyStrings strings;
  final bool Function(MawyTableCommand) available;
  final ValueChanged<MawyTableCommand> onCommand;
  final Widget child;

  @override
  State<_TableToolsHost> createState() => _TableToolsHostState();
}

class _TableToolsHostState extends State<_TableToolsHost> {
  final GlobalKey _stack = GlobalKey(debugLabel: 'MawyEditor table tools');
  final GlobalKey _bar = GlobalKey(debugLabel: 'MawyEditor table tools bar');

  /// How far down the field the bar is, or `null` while there is no bar.
  double? _top;

  /// How far across it is, from the left.
  double _left = 0;

  /// How wide the bar was when it was placed, which is a guess until it has
  /// been laid out once.
  double? _wide;

  /// How many rows and columns the selection covers.
  int _rows = 1;
  int _columns = 1;
  bool _queued = false;

  @override
  void initState() {
    super.initState();
    _listen(widget);
  }

  @override
  void didUpdateWidget(_TableToolsHost old) {
    super.didUpdateWidget(old);

    if (old.controller != widget.controller ||
        old.focus != widget.focus ||
        old.scroll != widget.scroll) {
      _forget(old);
      _listen(widget);
    }

    _queue();
  }

  @override
  void dispose() {
    _forget(widget);
    super.dispose();
  }

  void _listen(_TableToolsHost host) {
    host.controller.addListener(_queue);
    host.focus.addListener(_queue);
    host.scroll.addListener(_queue);
  }

  void _forget(_TableToolsHost host) {
    host.controller.removeListener(_queue);
    host.focus.removeListener(_queue);
    host.scroll.removeListener(_queue);
  }

  void _queue() {
    if (_queued) {
      return;
    }

    _queued = true;
    WidgetsBinding.instance.addPostFrameCallback((Duration _) {
      _queued = false;

      if (mounted) {
        _place();
      }
    });
    // Asked for, so the callback has a frame to come after.
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  void _place() {
    final TextSelection selection = widget.controller.selection;
    final String text = widget.controller.text;
    final MdRange? here = widget.active && widget.focus.hasFocus && selection.isValid
        ? tableRangeAt(text, selection.start)
        : null;
    // A selection over more than one cell is in the table as a caret is, and the
    // controls act on the rows and columns it covers; one that runs out of the
    // table is not.
    final MdRange? table =
        here != null &&
            (selection.isCollapsed || tableRangeAt(text, selection.end)?.start == here.start)
        ? here
        : null;
    final ({int top, int bottom, int left, int right, int rows, int columns})? span = table == null
        ? null
        : tableSpanAt(text, selection.start, selection.end);
    final RenderEditable? editable = widget.editableKey.currentState?.renderEditable;
    final RenderObject? stack = _stack.currentContext?.findRenderObject();
    final double? measured = _bar.currentContext?.size?.width;
    final double wide = measured ?? _wide ?? 280;
    double? top;
    double left = _left;

    // Under the line the caret is on, across from the caret, and over the line
    // where there is no room under it: beside the row being written in rather
    // than at the table's edge, which in a long table is a long way from it.
    if (table != null &&
        editable != null &&
        editable.attached &&
        stack is RenderBox &&
        stack.hasSize) {
      final Rect caret = editable.getLocalRectForCaret(
        TextPosition(offset: selection.extentOffset),
      );
      final Offset head = stack.globalToLocal(editable.localToGlobal(caret.topLeft));
      final double foot = stack.globalToLocal(editable.localToGlobal(caret.bottomLeft)).dy;
      final double below = foot + 8;
      final double above = head.dy - 8 - kMawyTableToolsHeight;
      final double most = stack.size.height - kMawyTableToolsHeight - 4;
      final bool rtl = Directionality.of(context) == TextDirection.rtl;

      top = below <= most || above < 4 ? math.max(4, math.min(below, most)) : above;
      left = math.max(
        4,
        math.min(rtl ? head.dx - wide + 12 : head.dx - 12, stack.size.width - wide - 4),
      );
    }

    if (top != _top ||
        left != _left ||
        (span?.rows ?? 1) != _rows ||
        (span?.columns ?? 1) != _columns) {
      setState(() {
        _top = top;
        _left = left;
        _wide = wide;
        _rows = span?.rows ?? 1;
        _columns = span?.columns ?? 1;
      });
    }

    // Placed by a guess at its width, and placed again once it has one.
    if (top != null && measured == null) {
      _queue();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      key: _stack,
      // As large as the source, whatever the source is given, rather than as
      // large as a stack of nothing but positioned children would be.
      fit: StackFit.passthrough,
      children: <Widget>[
        widget.child,
        if (_top != null)
          Positioned(
            top: _top,
            left: _left,
            child: MawyTableTools(
              key: _bar,
              tokens: widget.tokens,
              strings: widget.strings,
              available: widget.available,
              onCommand: widget.onCommand,
              rows: _rows,
              columns: _columns,
            ),
          ),
      ],
    );
  }
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
    required this.canUndo,
    required this.canRedo,
    required this.onTravel,
    required this.editable,
    required this.inTable,
    required this.onInsertTable,
    required this.tableAvailable,
    required this.headingLevels,
    required this.onHeading,
    required this.finding,
    required this.onFind,
    required this.onOpen,
    required this.frame,
    required this.placement,
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
  final bool canUndo;
  final bool canRedo;
  final void Function({required bool back}) onTravel;

  /// Whether there is a source showing that can be changed, which a menu of
  /// things to change in it needs before it is worth opening.
  final bool editable;

  /// Whether the caret is in a table, where the commands that make a block have
  /// nothing to make. See [blockCommand].
  final bool inTable;
  final void Function(int columns, int rows) onInsertTable;
  final bool Function(MawyTableCommand) tableAvailable;
  final List<int> headingLevels;
  final ValueChanged<int> onHeading;
  final bool finding;
  final VoidCallback? onFind;
  final VoidCallback? onOpen;
  final MawyFrame frame;
  final MawyToolbarPlacement placement;

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

  /// What each item on the toolbar is: the command it runs, and the glyph it
  /// wears.
  ///
  /// One table rather than two keyed by the same enum. Two lists of the same
  /// twelve names is two places to add a control and one of them to forget,
  /// and an item drawn with somebody else's icon is a bug nothing catches.
  ///
  /// The label is not in here because it is not a constant: it is whichever of
  /// two languages the viewer was asked for, read off an object at build time.
  static const Map<MawyEditorToolbarItem, ({MawyCommand command, IconData icon})> _controls =
      <MawyEditorToolbarItem, ({MawyCommand command, IconData icon})>{
        MawyEditorToolbarItem.bold: (command: MawyCommand.bold, icon: LucideIcons.bold),
        MawyEditorToolbarItem.italic: (command: MawyCommand.italic, icon: LucideIcons.italic),
        MawyEditorToolbarItem.strikethrough: (
          command: MawyCommand.strikethrough,
          icon: LucideIcons.strikethrough,
        ),
        MawyEditorToolbarItem.code: (command: MawyCommand.code, icon: LucideIcons.code),
        MawyEditorToolbarItem.link: (command: MawyCommand.link, icon: LucideIcons.link),
        MawyEditorToolbarItem.image: (command: MawyCommand.image, icon: LucideIcons.image),
        MawyEditorToolbarItem.quote: (command: MawyCommand.quote, icon: LucideIcons.textQuote),
        MawyEditorToolbarItem.bulletList: (command: MawyCommand.bulletList, icon: LucideIcons.list),
        MawyEditorToolbarItem.orderedList: (
          command: MawyCommand.orderedList,
          icon: LucideIcons.listOrdered,
        ),
        MawyEditorToolbarItem.taskList: (
          command: MawyCommand.taskList,
          icon: LucideIcons.listChecks,
        ),
        MawyEditorToolbarItem.codeBlock: (command: MawyCommand.codeBlock, icon: LucideIcons.braces),
        MawyEditorToolbarItem.rule: (command: MawyCommand.rule, icon: LucideIcons.minus),
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

  String _headingLabel(int depth) => switch (depth) {
    1 => widget.strings.heading1,
    2 => widget.strings.heading2,
    3 => widget.strings.heading3,
    4 => widget.strings.heading4,
    5 => widget.strings.heading5,
    _ => widget.strings.heading6,
  };

  static const List<IconData> _headingIcons = <IconData>[
    LucideIcons.heading1,
    LucideIcons.heading2,
    LucideIcons.heading3,
    LucideIcons.heading4,
    LucideIcons.heading5,
    LucideIcons.heading6,
  ];

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

      if (item == MawyEditorToolbarItem.undo || item == MawyEditorToolbarItem.redo) {
        final bool back = item == MawyEditorToolbarItem.undo;

        // Here for a writer with no keyboard, which on a phone is every writer:
        // `Mod`+`Z` is the whole of undo otherwise.
        children.add(
          MawyToolbarButton(
            icon: back ? LucideIcons.undo2 : LucideIcons.redo2,
            label: back ? widget.strings.undo : widget.strings.redo,
            tokens: widget.tokens,
            focusNode: next(),
            enabled: back ? widget.canUndo : widget.canRedo,
            onPressed: () => widget.onTravel(back: back),
          ),
        );

        continue;
      }

      if (item == MawyEditorToolbarItem.table) {
        children.add(
          MawyToolbarMenu(
            icon: LucideIcons.table,
            label: widget.strings.table,
            tokens: widget.tokens,
            focusNode: next(),
            enabled: widget.editable,
            // A grid of sizes, and nothing else: what reshapes a table is hung
            // beside the table the caret is in, where it has something to act
            // on. Built when the menu opens, because whether a table can go
            // where the caret is — not in a code block, not in another table —
            // is a parse.
            builder: (VoidCallback close) => MawyTableSizeGrid(
              tokens: widget.tokens,
              strings: widget.strings,
              enabled: widget.tableAvailable(MawyTableCommand.insertTable),
              onPick: (int columns, int rows) {
                // Shut first, so the focus the insert puts back in the source
                // is not taken back by the panel closing.
                close();
                widget.onInsertTable(columns, rows);
              },
            ),
          ),
        );

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
        // One menu rather than a button a level, which is what the React
        // package's toolbar does: the levels and body text are answers to one
        // question, and a button each is that many questions.
        children.add(
          MawyToolbarMenu(
            icon: LucideIcons.heading,
            label: widget.strings.heading,
            tokens: widget.tokens,
            focusNode: next(),
            enabled: !widget.inTable,
            builder: (VoidCallback close) => MawyToolbarChoice<int>(
              tokens: widget.tokens,
              value: widget.headingLevels.firstWhere(
                (int depth) => headingActive(widget.state, depth),
                orElse: () => 0,
              ),
              options: <MawyToolbarOption<int>>[
                for (final int depth in widget.headingLevels)
                  MawyToolbarOption<int>(
                    depth,
                    _headingLabel(depth),
                    icon: _headingIcons[depth - 1],
                  ),
                MawyToolbarOption<int>(0, widget.strings.paragraph, icon: LucideIcons.pilcrow),
              ],
              onChanged: (int chosen) {
                widget.onHeading(chosen);
                close();
              },
            ),
          ),
        );

        continue;
      }

      final ({MawyCommand command, IconData icon})? control = _controls[item];

      if (control == null) {
        continue;
      }

      children.add(
        MawyToolbarButton(
          icon: control.icon,
          label: _labelFor(item),
          tokens: widget.tokens,
          focusNode: next(),
          pressed: commandActive(control.command, widget.state),
          enabled: !(widget.inTable && blockCommand(control.command)),
          onPressed: () => widget.onCommand?.call(control.command),
        ),
      );
    }

    final bool floating = widget.frame == MawyFrame.floating;
    final BorderSide line = BorderSide(color: widget.tokens.border);

    return MawyOpensUp(
      // A bar along the bottom has nothing under it to open into, so the
      // menus and the names its buttons carry go up instead.
      up: widget.placement == MawyToolbarPlacement.bottom,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: floating ? widget.tokens.backgroundRaised : widget.tokens.chrome,
          border: floating
              ? Border.all(color: widget.tokens.border)
              : Border(
                  bottom: widget.placement == MawyToolbarPlacement.top ? line : BorderSide.none,
                  top: widget.placement == MawyToolbarPlacement.bottom ? line : BorderSide.none,
                ),
          // A row of round buttons and nothing else, so the box around them is
          // round too. The editor's toolbar has no line of text in it either.
          borderRadius: floating ? BorderRadius.circular(999) : null,
          boxShadow: floating
              ? <BoxShadow>[
                  BoxShadow(
                    color: const Color(0xFF101018).withValues(alpha: 0.14),
                    blurRadius: 28,
                    offset: const Offset(0, 10),
                  ),
                ]
              : null,
        ),
        child: Semantics(
          container: true,
          label: widget.strings.toolbar,
          child: MawyRovingRow(
            roving: _roving,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              // Barred across the editor the row is the width of the editor;
              // floating it is the width of its own buttons.
              child: Row(
                mainAxisSize: floating ? MainAxisSize.min : MainAxisSize.max,
                children: children,
              ),
            ),
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
          // Thirteen pixels to take hold of and one drawn: five is a target a
          // finger misses, and the bar is the only way to change the split
          // without a keyboard. The React package widens the same way and pulls
          // the extra back over the panes; a `Row` has no negative margin, so
          // here the eight pixels come out of the two panes instead.
          child: SizedBox(
            width: 13,
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
