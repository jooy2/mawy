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
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:mawy/src/internal/copying.dart';
import 'package:mawy/src/internal/find_bar.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/overlay.dart';
import 'package:mawy/src/internal/wheel.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/find.dart';
import 'package:mawy/src/markdown/parse.dart';
import 'package:mawy/src/markdown/render.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';
import 'package:mawy/src/viewer/anchors.dart';
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
  MawyViewerToolbarItem.find,
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
    this.anchors,
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
  /// document and its interface are drawn in, and the whole of what theming is.
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

  /// The language of the viewer's own interface.
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

  /// Where each top-level block of the document ends up, filled in as it draws.
  ///
  /// For anything lining a second view up with this one — the editor's `split`
  /// is what it exists for, and it is how the preview follows the source to the
  /// block rather than to the same fraction of the way down the file. Leave it
  /// out and nothing is kept.
  final MawyViewerAnchors? anchors;

  @override
  State<MawyViewer> createState() => _MawyViewerState();
}

class _MawyViewerState extends State<MawyViewer> with MawyCopying<MawyViewer> {
  late MawyTypography _held = widget.defaultTypography;
  late final ScrollController _scroller = widget.scrollController ?? ScrollController();
  final Map<String, GlobalKey> _headings = <String, GlobalKey>{};

  /// The same slugs, in the order they are drawn, so one can be found by index.
  final List<String> _order = <String>[];

  /// The heading the reader is at, and the one they asked to be at.
  ///
  /// Measured from the scroll while the panel is open, and pinned to whatever
  /// was pressed until the reader goes somewhere of their own — the React
  /// package's rule, for the reason it has it: following an entry is an
  /// animated scroll that passes over every heading between here and there, and
  /// the last heading of a document cannot reach the top of a box taller than
  /// what is under it.
  String? _active;
  String? _chosen;

  /// Where a press started, and whether the link under it has been followed.
  ///
  /// A link inside the document is a span with a tap recognizer on it, and on a
  /// desktop that recognizer loses: the selection around it watches the mouse
  /// for a drag and takes the gesture before a tap can be declared. So the
  /// press is read here as well, by a `Listener`, which is not in the gesture
  /// arena and cannot lose it. The recognizer stays because it is what makes a
  /// link a tappable thing to a screen reader, and what answers on a touch
  /// screen — whichever of the two gets there first follows the link, and the
  /// other stands down.
  Offset? _pressed;
  bool _followed = false;

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
  /// The tap recognizers the links in the document are using, by where each
  /// link starts. See `MawyRenderContext.recognizerFor`.
  final Map<Object, TapGestureRecognizer> _recognizers = <Object, TapGestureRecognizer>{};

  /// Which of them this build asked for, so the rest can be let go afterwards.
  final Set<Object> _wanted = <Object>{};
  bool _outlineOpen = false;

  /* ---------------------------------------------------------------------
   * Finding
   * ------------------------------------------------------------------ */

  /// The find bar, which is closed until somebody asks for it.
  ///
  /// A platform's own find does not reach inside a Flutter view at all on the
  /// desktop or the web, so a reader who has just been given a find button on
  /// the editor and goes looking for the same one here has nowhere else to go.
  bool _finding = false;
  String _query = '';
  bool _matchCase = false;
  int _at = 0;

  /// A key on each top-level block, so a match in one can be scrolled to.
  final Map<int, GlobalKey> _blocks = <int, GlobalKey>{};

  /// Whether the toolbar was given a find button, which is what decides
  /// whether `Ctrl`+`F` belongs to this viewer as well.
  bool get _searchable => widget.toolbar.contains(MawyViewerToolbarItem.find);

  void _openFind() {
    setState(() => _finding = true);
  }

  void _closeFind() {
    setState(() => _finding = false);
  }

  void _setQuery(String query) {
    if (query == _query) {
      return;
    }

    // A new query starts at the first match rather than at wherever the last
    // one left off, which is somewhere in a document nobody is reading now.
    setState(() {
      _query = query;
      _at = 0;
    });
  }

  void _step(MawyFound found, {required bool forwards}) {
    if (found.total == 0) {
      return;
    }

    setState(() {
      _at = (_at.clamp(0, found.total - 1) + (forwards ? 1 : -1) + found.total) % found.total;
    });

    _showMatch(found);
  }

  /// The block the current match is in, brought into view.
  ///
  /// A span is not a widget and has no position of its own, so what can be
  /// scrolled to is the block that holds it. Close enough to be useful, and
  /// honest about what it is: the paragraph you are looking at is the one the
  /// match is in.
  void _showMatch(MawyFound found) {
    WidgetsBinding.instance.addPostFrameCallback((Duration _) {
      if (!mounted || found.total == 0) {
        return;
      }

      final int at = _at.clamp(0, found.total - 1);
      final BuildContext? target = _blocks[found.inBlock[at]]?.currentContext;

      if (target == null) {
        return;
      }

      unawaited(
        Scrollable.ensureVisible(
          target,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
          alignment: 0.2,
        ),
      );
    });
  }

  /// The document as it was last read. Never null after `initState`.
  late MdDocument _document;

  @override
  void initState() {
    super.initState();
    _scroller.addListener(_measureActive);
    _read();
  }

  @override
  void didUpdateWidget(MawyViewer old) {
    super.didUpdateWidget(old);

    if (widget.value != old.value || widget.parse != old.parse) {
      _read();
    }
  }

  @override
  void dispose() {
    _scroller.removeListener(_measureActive);

    for (final GestureRecognizer recognizer in _recognizers.values) {
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

  /// Reads the document, and throws away everything that was about the last one.
  ///
  /// Done when the text or the options change rather than while building. A
  /// build is not the place to change anything that outlives it — `anchors` is
  /// the application's own object, and telling it to forget where everything
  /// was in the middle of a build is telling something outside this widget to
  /// change while the frame it is part of is being put together.
  void _read() {
    _document = parseMarkdown(widget.value, widget.parse);
    _headings.clear();
    _order.clear();
    // Per position in the document, so a document with fewer blocks in it than
    // the last one leaves keys behind for positions that no longer exist.
    _blocks.clear();
    _dropAnchors();
    widget.anchors?.reset();
  }

  Brightness _brightness(BuildContext context) => switch (widget.colorScheme) {
    MawyColorScheme.light => Brightness.light,
    MawyColorScheme.dark => Brightness.dark,
    MawyColorScheme.system => MediaQuery.platformBrightnessOf(context),
  };

  /// The recognizer for the link starting at [key], made once and kept.
  ///
  /// A new one per link per build was a recognizer allocated for every link on
  /// the page every time the pointer moved over a code block, and the old ones
  /// were disposed at the top of the build that replaced them — while the
  /// spans holding them were still on the tree. What listens for the tap
  /// changes between builds and the recognizer does not, so only [onTap] is
  /// written again.
  TapGestureRecognizer _recognizerFor(Object key, VoidCallback onTap) {
    final TapGestureRecognizer held = _recognizers.putIfAbsent(key, TapGestureRecognizer.new);

    held.onTap = onTap;
    _wanted.add(key);

    return held;
  }

  /// Whether a sweep is already booked for the end of this frame.
  bool _sweeping = false;

  /// Books the letting-go for after the frame.
  ///
  /// Twice not here. The document body is rendered further down this same
  /// build, so what this build wants is not known yet — and the spans holding
  /// what it does not want are on the tree until this build has replaced them,
  /// which is the same reason the anchors are dropped a frame late.
  void _sweepRecognizers() {
    if (_sweeping) {
      return;
    }

    _sweeping = true;

    WidgetsBinding.instance.addPostFrameCallback((Duration _) {
      _sweeping = false;

      if (_recognizers.length == _wanted.length) {
        return;
      }

      final List<TapGestureRecognizer> stale = <TapGestureRecognizer>[
        for (final MapEntry<Object, TapGestureRecognizer> each in _recognizers.entries)
          if (!_wanted.contains(each.key)) each.value,
      ];

      _recognizers.removeWhere((Object key, TapGestureRecognizer _) => !_wanted.contains(key));

      for (final TapGestureRecognizer recognizer in stale) {
        recognizer.dispose();
      }
    });
  }

  /// Throws away the anchors the document that just went had.
  ///
  /// Not straight away, though: the widgets holding these nodes are still on
  /// the tree, and the build that replaces them has not happened yet. A node
  /// disposed out from under its own element is one the element detaches from
  /// after it is gone. The frame after is when nothing holds them.
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

  /// What the find bar found, kept until the question changes.
  ///
  /// Searching is a walk over every run of text in the document, and a viewer
  /// rebuilds for reasons that have nothing to do with the search — a pointer
  /// moving over a code block, a menu opening, the reader scrolling past a
  /// heading. Each of those was another walk over the whole document.
  MawyFound? _found;
  String? _foundQuery;
  bool? _foundMatchCase;
  MdDocument? _foundDocument;

  MawyFound _foundIn(MdDocument document) {
    if (!_finding) {
      return MawyFound.nothing();
    }

    if (_found == null ||
        _foundQuery != _query ||
        _foundMatchCase != _matchCase ||
        !identical(_foundDocument, document)) {
      _found = findInDocument(document.root.children, _query, _matchCase);
      _foundQuery = _query;
      _foundMatchCase = _matchCase;
      _foundDocument = document;
    }

    return _found!;
  }

  /// Where a heading would sit at the top of the view, or `null` if it cannot
  /// be measured this frame.
  double? _offsetOf(String slug) {
    final RenderObject? box = _headings[slug]?.currentContext?.findRenderObject();

    if (box is! RenderBox || !box.attached || !box.hasSize) {
      return null;
    }

    return RenderAbstractViewport.maybeOf(box)?.getOffsetToReveal(box, 0).offset;
  }

  /// Which heading is at the top of what can be seen.
  ///
  /// Found by halving rather than counted to. Headings come down the page in
  /// the order they are written, so the offsets are in that order too — and
  /// walking them from the first one meant asking the render tree where every
  /// heading above the view was, on every scroll notification, which for a
  /// reference page with a few hundred of them is the whole of it at the
  /// bottom.
  ///
  /// A heading with no offset this frame is one nothing can be said about, so
  /// the search treats it as being wherever the search is looking. That is the
  /// same answer the walk gave by skipping it.
  void _measureActive() {
    if (!_outlineOpen || !mounted) {
      return;
    }

    if (_chosen != null) {
      if (_active != _chosen) {
        setState(() => _active = _chosen);
      }

      return;
    }

    final double line = (_scroller.hasClients ? _scroller.offset : 0) + 24;
    int low = 0;
    int high = _order.length - 1;
    String? current = _order.isEmpty ? null : _order.first;

    while (low <= high) {
      final int middle = (low + high) ~/ 2;
      final double? at = _offsetOf(_order[middle]);

      if (at == null || at <= line) {
        current = _order[middle];
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    if (current != _active) {
      setState(() => _active = current);
    }
  }

  /// The link a place on the screen belongs to, if it belongs to one.
  ///
  /// A paragraph puts the span under the pointer into the hit-test path itself
  /// — that is how a tap ever reaches a span's recognizer — so this is the same
  /// answer the arena would have used, read from the same place and without
  /// having to win anything to get it.
  TapGestureRecognizer? _linkAt(Offset global) {
    final RenderObject? document = context.findRenderObject();

    if (document is! RenderBox || !document.attached) {
      return null;
    }

    final BoxHitTestResult hit = BoxHitTestResult();

    document.hitTest(hit, position: document.globalToLocal(global));

    for (final HitTestEntry<HitTestTarget> entry in hit.path) {
      final HitTestTarget target = entry.target;

      if (target is TextSpan && target.recognizer is TapGestureRecognizer) {
        return target.recognizer! as TapGestureRecognizer;
      }
    }

    return null;
  }

  /// A press that went down and came up on the same link follows it.
  ///
  /// In a microtask, because the gesture arena is swept as soon as this event
  /// has finished being dispatched: a frame later is too late to feel like a
  /// tap, and now is too early to know whether the recognizer won.
  void _release(PointerUpEvent event) {
    final Offset? from = _pressed;

    _pressed = null;

    if (from == null || (event.position - from).distance > 4) {
      _followed = false;

      return;
    }

    scheduleMicrotask(() {
      if (!_followed && mounted) {
        _linkAt(event.position)?.onTap?.call();
      }

      _followed = false;
    });
  }

  /// What the document's links are handed, so one is never followed twice.
  void _tapLink(String url, String? title) {
    _followed = true;
    widget.onLinkTap?.call(url, title);
  }

  /// The document moved by a key press.
  ///
  /// Flutter's own [ScrollAction] cannot be used here: it looks for the
  /// scrollable above whatever has the focus, and what has the focus is the
  /// [SelectableRegion], which sits above the scroll view rather than inside
  /// it. The controller is already held, so the arithmetic is done against
  /// that instead.
  Object? _scrollBy(ScrollIntent intent) {
    if (!_scroller.hasClients) {
      return null;
    }

    final ScrollPosition position = _scroller.position;
    final double step = switch (intent.type) {
      ScrollIncrementType.page => position.viewportDimension * 0.8,
      ScrollIncrementType.line => 60,
    };
    final double to = (position.pixels + (intent.direction == AxisDirection.up ? -step : step))
        .clamp(position.minScrollExtent, position.maxScrollExtent);

    if (to == position.pixels) {
      return null;
    }

    if (!mounted || MediaQuery.disableAnimationsOf(context)) {
      position.jumpTo(to);

      return null;
    }

    unawaited(
      position.animateTo(to, duration: const Duration(milliseconds: 140), curve: Curves.easeOut),
    );

    return null;
  }

  void _goTo(String slug) {
    final BuildContext? target = _headings[slug]?.currentContext;

    if (target == null) {
      return;
    }

    setState(() {
      _chosen = slug;
      _active = slug;
    });

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
    final MdDocument document = _document;
    final MawyFound found = _foundIn(document);

    /// The one being stepped through, kept inside a count that may have shrunk.
    final int current = found.total == 0 ? -1 : _at.clamp(0, found.total - 1);

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

    _wanted.clear();

    final MawyRenderContext render = MawyRenderContext(
      tokens: tokens,
      typography: type,
      strings: strings,
      body: body,
      footnotes: <String, MdFootnoteDefinition>{
        for (final MdFootnoteDefinition footnote in document.footnotes) footnote.label: footnote,
      },
      onLinkTap: widget.onLinkTap == null ? null : _tapLink,
      directives: widget.directives,
      highlighter: widget.highlight,
      source: widget.value,
      recognizerFor: widget.onLinkTap == null ? null : _recognizerFor,
      found: found,
      currentMatch: current,
    );

    final Widget? footnotes = renderFootnotes(document.footnotes, render);

    _sweepRecognizers();
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
                onOutlineToggle: () {
                  setState(() => _outlineOpen = !_outlineOpen);
                  // Nothing has been laid out yet on the frame the panel opens
                  // on, and an unmeasured panel is one with no mark in it.
                  WidgetsBinding.instance.addPostFrameCallback((Duration _) => _measureActive());
                },
                finding: _finding,
                onFind: document.root.children.isEmpty ? null : _openFind,
                copyState: copyState,
                onCopy: () => copy(widget.value),
              ),
            if (_finding && _searchable)
              MawyFindBar(
                tokens: tokens,
                strings: strings,
                query: _query,
                onQueryChange: _setQuery,
                matchCase: _matchCase,
                onMatchCaseChange: (bool next) => setState(() {
                  _matchCase = next;
                  _at = 0;
                }),
                total: found.total,
                current: current,
                onStep: (bool forwards) => _step(found, forwards: forwards),
                onClose: _closeFind,
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
                      active: _active,
                      onSelected: _goTo,
                    ),
                  Expanded(
                    child: Semantics(
                      label: strings.document,
                      container: true,
                      child: Listener(
                        // A wheel or a hand on the document is the reader
                        // saying they have gone somewhere of their own, and the
                        // entry they pressed stops being the answer.
                        onPointerDown: (PointerDownEvent event) {
                          _chosen = null;
                          _pressed = event.position;
                          _followed = false;
                        },
                        onPointerUp: _release,
                        onPointerSignal: (PointerSignalEvent _) => _chosen = null,
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
                            SingleActivator(LogicalKeyboardKey.keyF, control: true): _FindIntent(),
                            SingleActivator(LogicalKeyboardKey.keyF, meta: true): _FindIntent(),
                            // A document somebody has clicked into scrolls with
                            // the keyboard. A browser does this without being
                            // asked and here only a `WidgetsApp` does, which
                            // this package does not require — the same reason
                            // `mawyActivate` writes out Enter and the space bar.
                            SingleActivator(LogicalKeyboardKey.arrowUp): ScrollIntent(
                              direction: AxisDirection.up,
                            ),
                            SingleActivator(LogicalKeyboardKey.arrowDown): ScrollIntent(
                              direction: AxisDirection.down,
                            ),
                            SingleActivator(LogicalKeyboardKey.pageUp): ScrollIntent(
                              direction: AxisDirection.up,
                              type: ScrollIncrementType.page,
                            ),
                            SingleActivator(LogicalKeyboardKey.pageDown): ScrollIntent(
                              direction: AxisDirection.down,
                              type: ScrollIncrementType.page,
                            ),
                          },
                          child: Actions(
                            actions: <Type, Action<Intent>>{
                              ScrollIntent: CallbackAction<ScrollIntent>(onInvoke: _scrollBy),
                              _FindIntent: CallbackAction<_FindIntent>(
                                onInvoke: (_FindIntent _) {
                                  if (_searchable) {
                                    _openFind();
                                  }

                                  return null;
                                },
                              ),
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
                                padding:
                                    widget.padding ?? const EdgeInsets.fromLTRB(28, 40, 28, 96),
                                child: MawyWheelScroll(
                                  controller: _scroller,
                                  child: Center(
                                    child: ConstrainedBox(
                                      constraints: BoxConstraints(
                                        maxWidth: measure ?? double.infinity,
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: <Widget>[
                                          ..._withAnchors(document, render),
                                          ?footnotes,
                                        ],
                                      ),
                                    ),
                                  ),
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

  /// The blocks, with a key on every heading so the outline can reach it, and
  /// one on every block where somebody asked where the blocks are.
  List<Widget> _withAnchors(MdDocument document, MawyRenderContext render) {
    final List<Widget> drawn = renderBlocks(document.root.children, render);
    final List<MdBlock> blocks = document.root.children;
    final MawyViewerAnchors? places = widget.anchors;

    for (int index = 0; index < blocks.length; index += 1) {
      final MdBlock block = blocks[index];

      if (places != null) {
        drawn[index] = KeyedSubtree(key: places.keyFor(block.range.start), child: drawn[index]);
      }

      // Only while the bar is open, so that a viewer nobody is searching keeps
      // the tree it had. The keys are per position and stay put as matches are
      // stepped through, which is the difference between scrolling to a block
      // and rebuilding it on every press of next.
      if (_finding) {
        drawn[index] = KeyedSubtree(
          key: _blocks.putIfAbsent(index, GlobalKey.new),
          child: drawn[index],
        );
      }

      if (block is MdHeading) {
        final GlobalKey key = _headings.putIfAbsent(block.slug, () {
          _order.add(block.slug);

          return GlobalKey();
        });
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

/// `Ctrl`+`F`, on its way to the find bar.
class _FindIntent extends Intent {
  const _FindIntent();
}
