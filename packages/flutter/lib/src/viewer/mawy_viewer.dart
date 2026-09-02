/// A Markdown document, rendered and not editable.
///
/// The document becomes widgets rather than a string of anything, which is what
/// makes the safe default free: there is no markup on the path from Markdown to
/// the screen, so there is nothing to escape and nowhere for an injection to
/// arrive. Raw HTML written *inside* a document is shown as the characters it
/// was written with, and there is no option to make it otherwise — Flutter has
/// no HTML to draw it as.
library;

import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/overlay.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/parse.dart';
import 'package:mawy/src/markdown/render.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';
import 'package:mawy/src/viewer/mawy_viewer_outline.dart';
import 'package:mawy/src/viewer/mawy_viewer_toolbar.dart';

/// Everything the toolbar offers, in the order it draws them.
const List<MawyViewerToolbarItem> kMawyViewerToolbar = <MawyViewerToolbarItem>[
  MawyViewerToolbarItem.fontFamily,
  MawyViewerToolbarItem.fontSize,
  MawyViewerToolbarItem.lineHeight,
  MawyViewerToolbarItem.letterSpacing,
  MawyViewerToolbarItem.measure,
  MawyViewerToolbarItem.separator,
  MawyViewerToolbarItem.colorScheme,
  MawyViewerToolbarItem.outline,
  MawyViewerToolbarItem.copy,
];

/// A Markdown document, drawn.
///
/// ```dart
/// MawyViewer(value: '# Hello\n\nSome **Markdown**.')
/// ```
///
/// The typography is the reader's rather than the document's: the toolbar sets
/// the typeface, the size, the line height, the letter spacing and how wide the
/// column runs, and [onTypographyChange] reports whatever they chose so an
/// application can remember it. An application that would rather drive all of
/// that itself passes [typography] and `toolbar: const []`.
class MawyViewer extends StatefulWidget {
  /// Creates a viewer for [value].
  const MawyViewer({
    required this.value,
    super.key,
    this.parse = const MawyParseOptions(),
    this.colorScheme = MawyColorScheme.system,
    this.onColorSchemeChange,
    this.tokens,
    this.typography,
    this.defaultTypography = const MawyTypography(),
    this.onTypographyChange,
    this.toolbar = kMawyViewerToolbar,
    this.locale = MawyLocale.en,
    this.onLinkTap,
    this.directives,
    this.highlight,
    this.padding,
    this.scrollController,
  });

  /// The document, as Markdown.
  final String value;

  /// How the Markdown is read.
  final MawyParseOptions parse;

  /// Which palette to draw in.
  final MawyColorScheme colorScheme;

  /// Called when the reader changes it from the toolbar.
  final ValueChanged<MawyColorScheme>? onColorSchemeChange;

  /// The colours to draw in, where the application would rather choose them.
  ///
  /// This is the React package's `--mawy-*` custom properties: everything the
  /// document and its chrome are drawn in, and the whole of what theming is.
  /// It is a function of the brightness rather than one palette, because a
  /// viewer settles on its brightness after it has been handed everything else
  /// — from [colorScheme], or from the platform where that is
  /// [MawyColorScheme.system] — and a document that follows the platform should
  /// follow it in both palettes.
  ///
  /// ```dart
  /// MawyViewer(
  ///   value: document,
  ///   tokens: (Brightness brightness) =>
  ///       MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
  /// );
  /// ```
  ///
  /// [MawyTokens.light] and [MawyTokens.dark] otherwise, which are the
  /// stylesheet's own values.
  final MawyTokensBuilder? tokens;

  /// How the document is set, when the application owns it.
  ///
  /// Passing it makes the settings the application's: the toolbar still reports
  /// what the reader chose through [onTypographyChange], and nothing changes
  /// until the application passes the new value back.
  final MawyTypography? typography;

  /// How it is set to begin with, when the viewer is to keep it itself.
  final MawyTypography defaultTypography;

  /// Called whether or not [typography] is being passed.
  final ValueChanged<MawyTypography>? onTypographyChange;

  /// The controls to draw and the order to draw them in. `const []` for none.
  final List<MawyViewerToolbarItem> toolbar;

  /// The language of the viewer's own chrome.
  final MawyLocale locale;

  /// What a tapped link does.
  ///
  /// Nothing at all without one, and deliberately: opening a URL means handing
  /// it to the platform, and which URLs an application is willing to hand over
  /// is not a decision a viewer should make. The scheme allowlist has already
  /// run — a `javascript:` never reaches here — but the rest is yours.
  final void Function(String url, String? title)? onLinkTap;

  /// What draws the constructs this package does not know about.
  ///
  /// A directive is a name and some attributes written in the document —
  /// `:::callout{kind=warning}` and its two shorter shapes — and the parser
  /// reads the shape without having any opinion about what it means. Which
  /// widget that becomes is the application's answer:
  ///
  /// ```dart
  /// MawyViewer(
  ///   value: document,
  ///   directives: <String, MawyDirectiveBuilder>{
  ///     'callout': (BuildContext context, MawyDirective directive) =>
  ///         Callout(kind: directive.attributes['kind'], children: directive.children!),
  ///   },
  /// );
  /// ```
  ///
  /// A name that is not here is drawn as the characters it was written with,
  /// the same answer raw HTML gets.
  final Map<String, MawyDirectiveBuilder>? directives;

  /// What colours a code block.
  ///
  /// Nothing by default, and that is the same decision the React package makes
  /// for the same reason: a highlighter is the largest thing a Markdown
  /// renderer can be made to carry and most documents have nothing in them to
  /// colour. [mawyHighlighter] is this package's own — pass it and a build
  /// keeps the grammars, leave it out and a build never has them.
  ///
  /// ```dart
  /// MawyViewer(value: document, highlight: mawyHighlighter)
  /// ```
  ///
  /// The one thing a highlighter has to promise is that its tokens *are* the
  /// code. What it hands back is joined together and checked against what went
  /// in, and a block whose tokens do not add up is drawn plain — colour is not
  /// worth a screen that says something the document does not.
  final MawyHighlighter? highlight;

  /// The space around the document. The React package's own numbers otherwise.
  final EdgeInsetsGeometry? padding;

  /// A controller for the document's own scroller, so an application can drive
  /// it or watch it.
  final ScrollController? scrollController;

  @override
  State<MawyViewer> createState() => _MawyViewerState();
}

class _MawyViewerState extends State<MawyViewer> {
  late MawyTypography _held = widget.defaultTypography;
  late final ScrollController _scroller = widget.scrollController ?? ScrollController();
  final Map<String, GlobalKey> _headings = <String, GlobalKey>{};

  /// Where the focus is while a selection is being made in the document.
  ///
  /// A [SelectableRegion] takes the focus when a drag starts in it, and a node
  /// of its own is what keeps that from being the same node a heading anchor
  /// uses. It is not a tab stop: reading is not a control.
  final FocusNode _selection = FocusNode(debugLabel: 'MawyViewer selection', skipTraversal: true);

  /// Somewhere for the focus to land on each heading, by slug.
  ///
  /// Not a tab stop — `skipTraversal`, which is the web's `tabIndex = -1` said
  /// the other way round. A heading is not a control and Tab should not stop on
  /// every one of them; it is somewhere the focus can be *put*, which is what
  /// following an outline entry does.
  final Map<String, FocusNode> _anchors = <String, FocusNode>{};

  /// The tap recognizers the links in the document needed, last time it was
  /// drawn. Thrown away and made again on every build, because a recognizer
  /// that outlives the span it was made for is a leak.
  List<GestureRecognizer> _recognizers = <GestureRecognizer>[];
  bool _outlineOpen = false;
  bool _copied = false;

  MdDocument? _document;
  String? _parsedFrom;
  MawyParseOptions? _parsedWith;

  @override
  void dispose() {
    for (final GestureRecognizer recognizer in _recognizers) {
      recognizer.dispose();
    }

    for (final FocusNode anchor in _anchors.values) {
      anchor.dispose();
    }

    _selection.dispose();

    if (widget.scrollController == null) {
      _scroller.dispose();
    }

    super.dispose();
  }

  MawyTypography get _typography => widget.typography ?? _held;

  void _setTypography(MawyTypography next) {
    if (widget.typography == null) {
      setState(() => _held = next);
    }

    widget.onTypographyChange?.call(next);
  }

  /// The parsed document, kept until the text or the options change.
  ///
  /// A parse is not expensive and a rebuild is not a reason to do one: a
  /// viewer rebuilds when the pointer moves over a code block.
  MdDocument get _parsed {
    if (_document == null || _parsedFrom != widget.value || _parsedWith != widget.parse) {
      _document = parseMarkdown(widget.value, widget.parse);
      _parsedFrom = widget.value;
      _parsedWith = widget.parse;
      _headings.clear();
      _dropAnchors();
    }

    return _document!;
  }

  Brightness _brightness(BuildContext context) => switch (widget.colorScheme) {
    MawyColorScheme.light => Brightness.light,
    MawyColorScheme.dark => Brightness.dark,
    MawyColorScheme.system => MediaQuery.platformBrightnessOf(context),
  };

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.value));

    if (!mounted) {
      return;
    }

    setState(() => _copied = true);

    await Future<void>.delayed(const Duration(milliseconds: 1600));

    if (mounted) {
      setState(() => _copied = false);
    }
  }

  /// Throws away the anchors the document that just went had.
  ///
  /// Not here, though: this is called from `build`, and the widgets holding
  /// these nodes are the ones being replaced by the build that is asking. A
  /// node disposed out from under its own element is one the element detaches
  /// from after it is gone. The frame after is when nothing holds them.
  void _dropAnchors() {
    if (_anchors.isEmpty) {
      return;
    }

    final List<FocusNode> stale = _anchors.values.toList();

    _anchors.clear();

    WidgetsBinding.instance.addPostFrameCallback((Duration _) {
      for (final FocusNode anchor in stale) {
        anchor.dispose();
      }
    });
  }

  void _goTo(String slug) {
    final BuildContext? target = _headings[slug]?.currentContext;

    if (target == null) {
      return;
    }

    unawaited(
      Scrollable.ensureVisible(
        target,
        // A reader who asked the platform for less movement asked to be at the
        // heading rather than to be taken to it: this is the stylesheet's
        // `scroll-behavior: auto` under the same setting.
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
        alignment: 0.02,
      ),
    );

    // Moving the page is only half of following a link: the focus has to go
    // with it, or the next Tab carries on from the panel rather than from the
    // heading the reader just asked to be at.
    _anchors[slug]?.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final Brightness brightness = _brightness(context);
    final MawyTokens tokens = widget.tokens?.call(brightness) ?? MawyTokens.of(brightness);
    final MawyStrings strings = stringsFor(widget.locale);
    final MawyTypography type = _typography;
    final MdDocument document = _parsed;

    final TextStyle body = TextStyle(
      color: tokens.foreground,
      fontFamily: type.fontFamilyName,
      fontFamilyFallback: type.fontFamilyName != null
          ? null
          : switch (type.fontFamily) {
              MawyFontFamily.sans => const <String>['Pretendard', 'Noto Sans KR'],
              MawyFontFamily.serif => const <String>['Georgia', 'Noto Serif KR'],
              MawyFontFamily.mono => const <String>['Menlo', 'Consolas', 'Roboto Mono'],
            },
      fontSize: type.fontSize,
      height: type.lineHeight,
      letterSpacing: type.letterSpacing * type.fontSize,
    );

    for (final GestureRecognizer recognizer in _recognizers) {
      recognizer.dispose();
    }

    _recognizers = <GestureRecognizer>[];

    final MawyRenderContext render = MawyRenderContext(
      tokens: tokens,
      typography: type,
      strings: strings,
      body: body,
      footnotes: <String, MdFootnoteDefinition>{
        for (final MdFootnoteDefinition footnote in document.footnotes) footnote.label: footnote,
      },
      onLinkTap: widget.onLinkTap,
      directives: widget.directives,
      highlighter: widget.highlight,
      source: widget.value,
      recognizers: _recognizers,
    );

    final Widget? footnotes = renderFootnotes(document.footnotes, render);
    final double? measure = type.measure.width;

    return Container(
      color: tokens.background,
      child: mawyOverlay(
        context,
        Column(
          // The toolbar is the width of the viewer, not the width of its buttons.
          // A `Column` centres its children unless it is told otherwise.
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            if (widget.toolbar.isNotEmpty)
              MawyViewerToolbar(
                items: widget.toolbar,
                tokens: tokens,
                strings: strings,
                typography: type,
                onTypographyChange: _setTypography,
                colorScheme: widget.colorScheme,
                onColorSchemeChange: widget.onColorSchemeChange,
                outlineOpen: _outlineOpen,
                onOutlineToggle: () => setState(() => _outlineOpen = !_outlineOpen),
                copied: _copied,
                onCopy: _copy,
              ),
            Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  if (_outlineOpen)
                    MawyViewerOutline(
                      entries: document.outline,
                      tokens: tokens,
                      strings: strings,
                      onSelected: _goTo,
                    ),
                  Expanded(
                    child: Semantics(
                      label: strings.document,
                      container: true,
                      child: Shortcuts(
                        // What copies a selection. A browser does this without
                        // being asked and here only a `WidgetsApp` does, which
                        // this package does not require — the same reason
                        // `mawyActivate` writes out Enter and the space bar.
                        shortcuts: const <ShortcutActivator, Intent>{
                          SingleActivator(LogicalKeyboardKey.keyC, control: true):
                              CopySelectionTextIntent.copy,
                          SingleActivator(LogicalKeyboardKey.keyC, meta: true):
                              CopySelectionTextIntent.copy,
                        },
                        child: SelectableRegion(
                          focusNode: _selection,
                          // No handles and no context menu: both of those are
                          // Material's or Cupertino's, and a package that draws
                          // its own everything else should not pull in a
                          // toolbar it did not design. Dragging selects, a
                          // double tap takes the word, and the keys above copy.
                          selectionControls: emptyTextSelectionControls,
                          child: SingleChildScrollView(
                            controller: _scroller,
                            padding: widget.padding ?? const EdgeInsets.fromLTRB(28, 40, 28, 96),
                            child: Center(
                              child: ConstrainedBox(
                                constraints: BoxConstraints(maxWidth: measure ?? double.infinity),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[..._withAnchors(document, render), ?footnotes],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// The blocks, with a key on every heading so the outline can reach it.
  List<Widget> _withAnchors(MdDocument document, MawyRenderContext render) {
    final List<Widget> drawn = renderBlocks(document.root.children, render);
    final List<MdBlock> blocks = document.root.children;

    for (int index = 0; index < blocks.length; index += 1) {
      final MdBlock block = blocks[index];

      if (block is MdHeading) {
        final GlobalKey key = _headings.putIfAbsent(block.slug, GlobalKey.new);
        final FocusNode anchor = _anchors.putIfAbsent(
          block.slug,
          () => FocusNode(debugLabel: 'MawyViewer #${block.slug}', skipTraversal: true),
        );

        drawn[index] = KeyedSubtree(
          key: key,
          child: Focus(focusNode: anchor, child: drawn[index]),
        );
      }
    }

    return drawn;
  }
}
