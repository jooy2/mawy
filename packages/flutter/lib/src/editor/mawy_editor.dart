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

import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/editor/commands.dart';
import 'package:mawy/src/editor/source_field.dart';
import 'package:mawy/src/editor/status.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/markdown/parse.dart' show MawyParseOptions;
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';
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
  MawyEditorToolbarItem.bold,
  MawyEditorToolbarItem.italic,
  MawyEditorToolbarItem.strikethrough,
  MawyEditorToolbarItem.code,
  MawyEditorToolbarItem.separator,
  MawyEditorToolbarItem.heading,
  MawyEditorToolbarItem.quote,
  MawyEditorToolbarItem.bulletList,
  MawyEditorToolbarItem.orderedList,
  MawyEditorToolbarItem.taskList,
  MawyEditorToolbarItem.separator,
  MawyEditorToolbarItem.link,
  MawyEditorToolbarItem.image,
  MawyEditorToolbarItem.codeBlock,
  MawyEditorToolbarItem.rule,
  MawyEditorToolbarItem.separator,
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

  /// The language the editor's own chrome is written in.
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
  late MawyEditorMode _mode = widget.mode ?? widget.defaultMode;
  late MawyColorScheme _scheme = widget.colorScheme;
  late MawyTypography _type = widget.typography ?? widget.defaultTypography;

  String get _value => _controller.text;
  MawyEditorMode get _current => widget.mode ?? _mode;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_changed);
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
    super.dispose();
  }

  String _lastReported = '';

  void _changed() {
    if (_controller.text != _lastReported) {
      _lastReported = _controller.text;
      widget.onChange?.call(_controller.text);
    }

    // The status bar and the toolbar's pressed states both read the selection,
    // so a caret that only moved is still a rebuild.
    setState(() {});
  }

  Brightness _brightness(BuildContext context) => switch (_scheme) {
    MawyColorScheme.light => Brightness.light,
    MawyColorScheme.dark => Brightness.dark,
    MawyColorScheme.system => MediaQuery.platformBrightnessOf(context),
  };

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
  }

  void _setScheme(MawyColorScheme scheme) {
    widget.onColorSchemeChange?.call(scheme);
    setState(() => _scheme = scheme);
  }

  @override
  Widget build(BuildContext context) {
    final Brightness brightness = _brightness(context);
    final MawyTokens tokens = widget.tokens?.call(brightness) ?? MawyTokens.of(brightness);
    final MawyStrings strings = stringsFor(widget.locale);
    final bool showSource = _current != MawyEditorMode.preview;
    final bool showPreview = _current != MawyEditorMode.plain;

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
    );

    final Widget preview = MawyViewer(
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
    );

    return Container(
      color: tokens.background,
      child: Column(
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
            ),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                if (showSource) Expanded(child: source),
                if (showSource && showPreview)
                  SizedBox(width: 1, child: ColoredBox(color: tokens.border)),
                if (showPreview) Expanded(child: preview),
              ],
            ),
          ),
          if (widget.status.isNotEmpty)
            _Status(items: widget.status, tokens: tokens, strings: strings, state: _state),
        ],
      ),
    );
  }

  /// `Enter` on a list item carries the marker down, and gives it up on an item
  /// still empty. `null` is "this is not a list item", and `Enter` is `Enter`.
  bool _enter() {
    final EditState? carried = continueList(_state);

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

      if (item == MawyEditorToolbarItem.colorScheme) {
        if (widget.onColorScheme == null) {
          continue;
        }

        children.add(
          MawyToolbarButton(
            icon: switch (widget.colorScheme) {
              MawyColorScheme.light => LucideIcons.sun,
              MawyColorScheme.dark => LucideIcons.moon,
              MawyColorScheme.system => LucideIcons.sunMoon,
            },
            label: widget.strings.colorScheme,
            tokens: widget.tokens,
            focusNode: next(),
            onPressed: () => widget.onColorScheme!(switch (widget.colorScheme) {
              MawyColorScheme.light => MawyColorScheme.dark,
              MawyColorScheme.dark => MawyColorScheme.system,
              MawyColorScheme.system => MawyColorScheme.light,
            }),
          ),
        );

        continue;
      }

      if (item == MawyEditorToolbarItem.heading) {
        for (final MapEntry<MawyCommand, IconData> each in const <MawyCommand, IconData>{
          MawyCommand.heading1: LucideIcons.heading1,
          MawyCommand.heading2: LucideIcons.heading2,
          MawyCommand.heading3: LucideIcons.heading3,
        }.entries) {
          children.add(
            MawyToolbarButton(
              icon: each.value,
              label: switch (each.key) {
                MawyCommand.heading1 => widget.strings.heading1,
                MawyCommand.heading2 => widget.strings.heading2,
                _ => widget.strings.heading3,
              },
              tokens: widget.tokens,
              focusNode: next(),
              pressed: commandActive(each.key, widget.state),
              onPressed: () => widget.onCommand?.call(each.key),
            ),
          );
        }

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
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
        decoration: BoxDecoration(
          color: tokens.chrome,
          border: Border(top: BorderSide(color: tokens.border)),
        ),
        child: Wrap(
          spacing: 14,
          runSpacing: 4,
          children: <Widget>[
            for (final String cell in cells)
              Text(
                cell,
                style: TextStyle(
                  color: tokens.foregroundSubtle,
                  fontSize: 12,
                  fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
