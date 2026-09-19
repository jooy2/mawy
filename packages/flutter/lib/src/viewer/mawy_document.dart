/// A document drawn where something else does the scrolling.
///
/// [MawyViewer] is a surface: it has a toolbar, a find bar, an outline and a
/// scroll view of its own, and it takes the height it is given. That is right
/// for a document somebody sits and reads, and it is the wrong shape for a
/// document that is one item of a list — a message in a conversation, a note
/// in a feed, a card in a column. A scrollable inside a scrollable has no
/// height to be given, so the viewer throws during layout rather than drawing
/// something short, and a box sized by the application around a document
/// nobody has measured yet is a guess that will be wrong.
///
/// So this is the drawing and nothing else. The same parser, the same
/// renderer, the same palette and the same policies as the viewer, laid out as
/// a column that is exactly as tall as the document and asks the list it is in
/// to do the scrolling. It is the Flutter half of what `MawyDocument` means in
/// the React package: the document with no viewer around it.
///
/// ```dart
/// ListView(
///   children: <Widget>[
///     for (final Message message in messages)
///       MawyDocument(value: message.body, padding: EdgeInsets.zero),
///   ],
/// )
/// ```
///
/// What is not here, and why:
///
/// - **No toolbar, find bar or outline.** Each is a control, and each of them
///   acts on a scroll position this widget does not have. An application that
///   wants them wants [MawyViewer].
/// - **No selection of its own.** Text is selectable in Flutter only inside a
///   `SelectableRegion`, and a list of documents wants one selection across
///   the whole list rather than one per item. So the application puts a
///   `SelectionArea` where it wants a selection to reach, and the links here
///   keep working under it.
/// - **No lazy building.** A column is as tall as its children, so every one
///   of them is built whatever the document's length. That is the trade for
///   being the right shape inside a list, and a document long enough for it to
///   show is a document that wants a viewer of its own. See
///   [kMawyViewerLazyFrom].
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/src/internal/body_style.dart';
import 'package:mawy/src/internal/directive_table.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/linking.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/parse.dart';
import 'package:mawy/src/markdown/render.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';
import 'package:mawy/src/viewer/mawy_viewer.dart';
import 'package:mawy/src/viewer/mentions.dart';

/// A Markdown document, drawn as widgets and nothing more.
///
/// See the top of this file for what it is for and what it leaves out.
class MawyDocument extends StatefulWidget {
  /// Creates a document.
  const MawyDocument({
    required this.value,
    super.key,
    this.parse = const MawyParseOptions(),
    this.colorScheme = MawyColorScheme.system,
    this.tokens,
    this.typography = const MawyTypography(),
    this.locale = MawyLocale.en,
    this.strings,
    this.onLinkTap,
    this.links = MawyLinkPolicy.show,
    this.images = MawyImagePolicy.show,
    this.directives,
    this.imageBuilder,
    this.resolveUrl,
    this.highlight,
    this.padding,
  });

  /// The document, as Markdown.
  final String value;

  /// How the Markdown is read.
  final MawyParseOptions parse;

  /// Which palette to draw in.
  ///
  /// There is no toolbar here to change it, so this is the application's
  /// answer rather than the reader's: [MawyColorScheme.system] follows the
  /// platform, and the other two do not.
  final MawyColorScheme colorScheme;

  /// The colours to draw in, where the application would rather choose them.
  ///
  /// The same builder [MawyViewer.tokens] takes, and the way to have the
  /// document sit on the ground the page is already painting:
  ///
  /// ```dart
  /// tokens: (Brightness brightness) =>
  ///     MawyTokens.of(brightness).copyWith(background: Colors.transparent),
  /// ```
  final MawyTokensBuilder? tokens;

  /// How the document is set.
  ///
  /// A value rather than a starting point, for the reason [colorScheme] is
  /// one: nothing here offers a reader the type controls, so what the
  /// application passes is what the document is set in.
  final MawyTypography typography;

  /// The language of the few words this library writes itself.
  final MawyLocale locale;

  /// Those words, some or all of them, over the ones [locale] has.
  final MawyStrings? strings;

  /// What a tapped link does. Nothing at all without one — this package opens
  /// no URLs on anybody's behalf.
  final void Function(String url, String? title)? onLinkTap;

  /// How a link the document wrote is drawn. See [MawyLinkPolicy].
  final MawyLinkPolicy links;

  /// How a picture the document asks for is drawn. See [MawyImagePolicy].
  final MawyImagePolicy images;

  /// What draws the constructs this package does not know about.
  final Map<String, MawyDirectiveBuilder>? directives;

  /// What draws a picture, where the application would rather draw it itself.
  final MawyImageBuilder? imageBuilder;

  /// Where a relative URL in the document points.
  final MawyUrlResolver? resolveUrl;

  /// What colours a code block.
  final MawyHighlighter? highlight;

  /// The room around the prose.
  ///
  /// The stylesheet's default for a drawn document, so that the same document
  /// drawn by either package has the same margins. A document that is one item
  /// of a list usually wants [EdgeInsets.zero] and the list's own gutters.
  final EdgeInsetsGeometry? padding;

  @override
  State<MawyDocument> createState() => _MawyDocumentState();
}

class _MawyDocumentState extends State<MawyDocument> with MawyLinking<MawyDocument> {
  /// The document as it was last read. Never null after `initState`.
  late MdDocument _document;

  /// A key per footnote, for following a mention down to the note it points at.
  final Map<String, GlobalKey> _footnoteKeys = <String, GlobalKey>{};

  /// Which block first mentions each footnote, and a key on that block, for
  /// the way back up from the note.
  ///
  /// The block rather than the mention itself, for the reason `mentions.dart`
  /// gives: a span has nowhere of its own to be scrolled to. Only the blocks a
  /// note points back into are keyed, so a document with no footnotes carries
  /// no keys at all.
  final Map<String, int> _mentions = <String, int>{};
  final Map<int, GlobalKey> _mentionKeys = <int, GlobalKey>{};

  /// The directive table, held so that it changes when its contents do. See
  /// [sameDirectiveTable].
  late Map<String, MawyDirectiveBuilder>? _directives = widget.directives;

  /// The document as widgets, kept until something it is drawn from changes.
  ///
  /// A document in a list is rebuilt whenever the list rebuilds it, and none of
  /// those rebuilds are about the document. The recognizers are the reason this
  /// holds what it was drawn from as well as the drawing: a build that reuses
  /// the widgets asks for none of them, and a sweep run then would let go of
  /// every recognizer the document is using.
  List<Widget>? _drawn;
  Object? _drawnFrom;

  @override
  void initState() {
    super.initState();
    _read();
  }

  @override
  void didUpdateWidget(MawyDocument old) {
    super.didUpdateWidget(old);

    if (widget.value != old.value || widget.parse != old.parse) {
      _read();
    }

    if (!sameDirectiveTable(_directives, widget.directives)) {
      _directives = widget.directives;
      _drawn = null;
    }
  }

  @override
  void dispose() {
    disposeRecognizers();
    super.dispose();
  }

  /// Reads the document, and throws away everything that was about the last one.
  void _read() {
    _document = parseMarkdown(widget.value, widget.parse);
    _footnoteKeys.clear();
    _mentions.clear();
    _mentionKeys.clear();
    _drawn = null;

    for (final MdFootnoteDefinition footnote in _document.footnotes) {
      final int? block = blockMentioning(_document.root.children, footnote.label);

      if (block != null) {
        _mentions[footnote.label] = block;
        _mentionKeys.putIfAbsent(block, GlobalKey.new);
      }
    }
  }

  Brightness _brightness(BuildContext context) => switch (widget.colorScheme) {
    MawyColorScheme.light => Brightness.light,
    MawyColorScheme.dark => Brightness.dark,
    MawyColorScheme.system => MediaQuery.platformBrightnessOf(context),
  };

  /// Takes the reader to a note, or back to the sentence that mentioned it.
  ///
  /// Whatever scrolls this document is what moves, found by walking up from
  /// the widget being scrolled to — so a document inside a list scrolls the
  /// list, and one nothing scrolls goes nowhere, which is the honest answer.
  Future<void> _reveal(GlobalKey? key) async {
    final BuildContext? at = key?.currentContext;

    if (at == null || !at.mounted) {
      return;
    }

    final bool still = MediaQuery.disableAnimationsOf(context);

    await Scrollable.ensureVisible(
      at,
      alignment: 0.02,
      duration: still ? Duration.zero : const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
    );
  }

  List<Widget> _drawnFor(MawyRenderContext render, Object from) {
    if (_drawn != null && _drawnFrom == from) {
      return _drawn!;
    }

    countRecognizers();
    _drawnFrom = from;

    final List<Widget> blocks = renderBlocks(_document.root.children, render);

    for (final MapEntry<int, GlobalKey> each in _mentionKeys.entries) {
      blocks[each.key] = KeyedSubtree(key: each.value, child: blocks[each.key]);
    }

    final Widget? footnotes = renderFootnotes(_document.footnotes, render);

    _drawn = <Widget>[...blocks, ?footnotes];
    sweepRecognizers();

    return _drawn!;
  }

  @override
  Widget build(BuildContext context) {
    final Brightness brightness = _brightness(context);
    final MawyTokens tokens = widget.tokens?.call(brightness) ?? MawyTokens.of(brightness);
    final MawyStrings strings = widget.strings ?? stringsFor(widget.locale);
    final MawyTypography type = widget.typography;
    final TextStyle body = mawyBodyStyle(tokens, type);

    final MawyRenderContext render = MawyRenderContext(
      tokens: tokens,
      typography: type,
      strings: strings,
      body: body,
      footnotes: <String, MdFootnoteDefinition>{
        for (final MdFootnoteDefinition footnote in _document.footnotes) footnote.label: footnote,
      },
      onLinkTap: widget.onLinkTap == null ? null : _tapLink,
      links: widget.links,
      images: widget.images,
      directives: _directives,
      highlighter: widget.highlight,
      source: widget.value,
      imageBuilder: widget.imageBuilder,
      resolveUrl: widget.resolveUrl,
      recognizerFor: recognizerFor,
      onFootnoteTap: (String label) => _reveal(_footnoteKeys[label]),
      onFootnoteBack: (String label) => _reveal(_mentionKeys[_mentions[label]]),
      footnoteKey: (String label) => _footnoteKeys.putIfAbsent(label, GlobalKey.new),
    );

    // Everything the drawing is made of, so that a rebuild about anything else
    // keeps the widgets it already has. Written out in full rather than
    // narrowed to what seems likely to change.
    final List<Widget> drawn = _drawnFor(render, (
      tokens,
      type,
      strings,
      _directives,
      widget.highlight,
      widget.imageBuilder,
      widget.resolveUrl,
      widget.links,
      widget.images,
      // Whether a link does anything rather than what it does: the drawing is
      // handed `_tapLink`, which does not change, and an application writing
      // `onLinkTap: (url, _) => open(url)` where the widget is written hands
      // over a new closure on every build.
      widget.onLinkTap == null,
    ));

    final double? measure = type.measure.width;
    // Resolved rather than read off, because a padding written the way a
    // right-to-left application writes it has no `top` until it is.
    final EdgeInsets lead = (widget.padding ?? const EdgeInsets.fromLTRB(28, 40, 28, 96)).resolve(
      Directionality.of(context),
    );

    return Container(
      // The ground the document is drawn on, which is the stylesheet's
      // `background: var(--mawy-bg)` on a drawn document. An application that
      // has already painted its own says so through `tokens`.
      color: tokens.background,
      child: Semantics(
        label: strings.document,
        container: true,
        child: Listener(
          // A link is a span with a tap recognizer on it, and a selection
          // above this widget takes the gesture before that recognizer can be
          // declared. See `MawyLinking`.
          onPointerDown: pressedLink,
          onPointerUp: releasedLink,
          child: LayoutBuilder(
            builder: (BuildContext context, BoxConstraints box) {
              // The column of prose is centred by padding, as it is in the
              // viewer. A width nobody has bounded is one there is no centre
              // of, and the document simply runs as wide as it is given.
              final double inside = box.maxWidth - lead.horizontal;
              final double side = measure == null || !inside.isFinite || inside <= measure
                  ? 0
                  : (inside - measure) / 2;

              return Padding(
                padding: lead + EdgeInsets.symmetric(horizontal: side),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: drawn),
              );
            },
          ),
        ),
      ),
    );
  }

  /// What the document's links are handed, so one is never followed twice.
  void _tapLink(String url, String? title) {
    followedLink();
    widget.onLinkTap?.call(url, title);
  }
}
