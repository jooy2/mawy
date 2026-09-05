/// The document tree, drawn.
///
/// There is no HTML anywhere in here and no intermediate string of any kind.
/// Each node becomes a widget or a span chosen by a chain of type tests, which
/// is what makes the viewer safe by construction rather than by vigilance: a
/// document has no way to reach a widget this file does not name.
///
/// Everything is built on `package:flutter/widgets.dart`. Nothing imports
/// Material or Cupertino, so a Mawy document sits inside a Material app, a
/// Cupertino app or a bare [WidgetsApp] without dragging a second design system
/// in behind it.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/copying.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/find.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';

/// What every part of the drawing needs to know.
class MawyRenderContext {
  /// Creates a rendering context.
  const MawyRenderContext({
    required this.tokens,
    required this.typography,
    required this.strings,
    required this.body,
    required this.footnotes,
    this.onLinkTap,
    this.onImageError,
    this.imageBuilder,
    this.directives,
    this.source,
    this.recognizerFor,
    this.highlighter,
    this.found,
    this.currentMatch = -1,
  });

  /// The palette.
  final MawyTokens tokens;

  /// What colours a code block, if an application asked for one.
  ///
  /// `null` in an application that never named one, which is the default and is
  /// why nothing in this package reaches [mawyHighlighter] on its own: a Dart
  /// build drops what nothing references, and a viewer that mentioned it would
  /// make every application carry the tables behind it.
  final MawyHighlighter? highlighter;

  /// How the document is set.
  final MawyTypography typography;

  /// The library's own words.
  final MawyStrings strings;

  /// The style body text is drawn in. Everything else is relative to it.
  final TextStyle body;

  /// The document's footnotes, by label, so a `[^a]` in the middle of a
  /// sentence knows which number it is.
  final Map<String, MdFootnoteDefinition> footnotes;

  /// What a tapped link does. Nothing at all without one — this package opens
  /// no URLs on anybody's behalf.
  final void Function(String url, String? title)? onLinkTap;

  /// What is drawn where a picture will not load.
  final Widget Function(String url)? onImageError;

  /// What draws a picture, where the application would rather draw it itself.
  /// See [MawyImageBuilder].
  final MawyImageBuilder? imageBuilder;

  /// What draws the constructs this package does not know about, by name.
  ///
  /// A name that is not here is drawn as the characters it was written with —
  /// the same answer raw HTML gets, and for the same reason: a document should
  /// show what it says rather than quietly lose a piece of itself to a screen
  /// that was never told what it meant.
  final Map<String, MawyDirectiveBuilder>? directives;

  /// The Markdown the document was parsed from.
  ///
  /// The one thing the renderer reads the source for, and it is there so that
  /// an unhandled directive can be shown as what the author actually typed.
  /// Every range in the tree indexes this string.
  final String? source;

  /// Where a link gets the recognizer that hears a tap on it.
  ///
  /// Asked for rather than made here. A recognizer holds resources and has to
  /// be disposed, a span cannot do it, and the frame a build happens in is the
  /// one frame in which the last build's cannot be disposed either — the
  /// widgets holding those are still on the tree until this build replaces
  /// them. So whoever built this context owns them, hands out the one it
  /// already has for a link at [key], and throws away what nothing asked for
  /// once the frame is over.
  ///
  /// `null` where nothing is listening for a tap, which is a document whose
  /// links need no recognizer at all.
  final GestureRecognizer Function(Object key, VoidCallback onTap)? recognizerFor;

  /// What the viewer's find bar found, if anybody is searching.
  ///
  /// See `find.dart`: the search is over what the document draws, and the
  /// answer is keyed by the node that draws each run — so marking is a lookup
  /// here rather than a second walk that would have to agree with this one.
  final MawyFound? found;

  /// Which of [found] is being stepped through, or `-1` for none of them.
  final int currentMatch;

  /// The monospace family, which is a role rather than a font name.
  String? get monoFamily => null;
}

/// The em, in logical pixels — the unit every margin here is expressed in.
double _em(MawyRenderContext context) => context.typography.fontSize;

/* -------------------------------------------------------------------------
 * Directives
 * ---------------------------------------------------------------------- */

/// A directive, handed to whatever knows what it means.
///
/// Nothing here decides anything about the construct: the builder an
/// application registered under the name draws it, and this only assembles what
/// that builder is given. Which keeps the safety story exactly where it was —
/// the application composes widgets, and there is no markup on the path from
/// the document to the screen in either direction.
class _Directive extends StatelessWidget {
  const _Directive({required this.directive, required this.builder});

  final MawyDirective directive;
  final MawyDirectiveBuilder builder;

  @override
  Widget build(BuildContext buildContext) => builder(buildContext, directive);
}

/// The characters a directive was written with, in the document.
String _sourceOf(MdRange range, MawyRenderContext context) {
  final String? source = context.source;

  if (source == null || range.start < 0 || range.end > source.length) {
    return '';
  }

  return source.substring(range.start, range.end);
}

/// What a name nobody claimed is drawn as.
///
/// The same answer raw HTML gets, and showing the source is the one fallback
/// that cannot quietly lose part of a document: an unhandled `::video{src=…}`
/// has nothing inside it to fall back *to*, and a reader seeing the line the
/// author wrote can tell what was meant.
TextStyle _unclaimedStyle(MawyRenderContext context, TextStyle style) {
  return _codeStyle(context, style).copyWith(
    color: context.tokens.foregroundMuted,
    backgroundColor: context.tokens.backgroundSunken,
  );
}

/// One of the two block-shaped directives, drawn.
///
/// Both are the same handing over with a different name for what was inside
/// them: a container's blocks are its `children`, a leaf has none, and both
/// carry whatever `[label]` was written on the line.
Widget _directive(
  MawyRenderContext context, {
  required String name,
  required MawyDirectiveKind kind,
  required Map<String, String> attributes,
  required List<MdInline> label,
  required List<Widget>? children,
  required MdRange range,
}) {
  final MawyDirectiveBuilder? builder = context.directives?[name];
  final String source = _sourceOf(range, context);

  if (builder == null) {
    return _unclaimed(source, context);
  }

  return _Directive(
    builder: builder,
    directive: MawyDirective(
      name: name,
      kind: kind,
      attributes: attributes,
      label: label.isEmpty ? null : renderInline(label, context, context.body),
      children: children,
      range: range,
      source: source,
    ),
  );
}

/// A block of characters the screen was not told how to draw.
///
/// Raw HTML and a directive nobody claimed are the same answer to the same
/// question — a document said something this screen has no widget for — so both
/// are shown as what the author actually typed, and they look the same because
/// they are the same thing.
Widget _unclaimed(String text, MawyRenderContext context) {
  final double em = _em(context);

  return Container(
    width: double.infinity,
    padding: EdgeInsets.symmetric(horizontal: em * 0.7, vertical: em * 0.5),
    decoration: BoxDecoration(
      color: context.tokens.backgroundSunken,
      borderRadius: BorderRadius.circular(MawyRadius.small),
      border: Border.all(color: context.tokens.borderStrong),
    ),
    child: Text(
      text,
      style: _codeStyle(
        context,
        context.body,
      ).copyWith(backgroundColor: null, color: context.tokens.foregroundMuted, fontSize: em * 0.82),
    ),
  );
}

/* -------------------------------------------------------------------------
 * Inline
 * ---------------------------------------------------------------------- */

/// A run of inline nodes, as one span.
InlineSpan renderInline(List<MdInline> nodes, MawyRenderContext context, TextStyle style) {
  return TextSpan(
    children: nodes
        .map((MdInline node) => _inlineSpan(node, context, style))
        .toList(growable: false),
  );
}

TextStyle _codeStyle(MawyRenderContext context, TextStyle style) {
  return style.copyWith(
    fontFamily: 'monospace',
    fontFamilyFallback: const <String>['Menlo', 'Consolas', 'Roboto Mono'],
    fontSize: (style.fontSize ?? _em(context)) * 0.875,
    letterSpacing: 0,
    color: context.tokens.codeForeground,
    backgroundColor: context.tokens.codeBackground,
  );
}

/// A name in the middle of a sentence, drawn as one.
///
/// Two things the block style does not want. The accent, because a name is a
/// different kind of thing from the sentence around it and the box alone says
/// so quietly enough to miss — the React package colours it the same way, and
/// the pair clears 5.5:1 on the box in either theme.
///
/// And a line height of its own, which is what keeps the box from being the
/// full height of the line. `TextStyle.background` fills the run's own box, and
/// a run inheriting a paragraph's line height fills the paragraph's line: a
/// slab from the line above to the line below, with the words in the middle of
/// it. The strut holds the line itself where it was, so this changes the
/// drawing and not the spacing.
TextStyle _inlineCodeStyle(MawyRenderContext context, TextStyle style) {
  return _codeStyle(context, style).copyWith(color: context.tokens.accent, height: 1.25);
}

/// A run of text, with whatever the find bar found in it marked.
///
/// One span where nothing was found, and that matters: a paragraph in a
/// document nobody is searching goes on being one span rather than a span
/// holding one child that holds the text.
InlineSpan _marked(MdInline node, String value, MawyRenderContext context, TextStyle style) {
  final List<MawyDocumentMatch>? matches = context.found?.at[node];

  if (matches == null || matches.isEmpty) {
    return TextSpan(text: value, style: style);
  }

  final List<InlineSpan> pieces = <InlineSpan>[];
  int at = 0;

  for (final MawyDocumentMatch match in matches) {
    if (match.start > at) {
      pieces.add(TextSpan(text: value.substring(at, match.start)));
    }

    pieces.add(
      TextSpan(
        text: value.substring(match.start, match.end),
        style: TextStyle(
          backgroundColor: match.index == context.currentMatch
              ? context.tokens.findCurrent
              : context.tokens.find,
        ),
      ),
    );
    at = match.end;
  }

  if (at < value.length) {
    pieces.add(TextSpan(text: value.substring(at)));
  }

  return TextSpan(style: style, children: pieces);
}

InlineSpan _inlineSpan(MdInline node, MawyRenderContext context, TextStyle style) {
  if (node is MdText) {
    return _marked(node, node.value, context, style);
  }

  if (node is MdEmphasis) {
    return renderInline(node.children, context, style.copyWith(fontStyle: FontStyle.italic));
  }

  if (node is MdStrong) {
    return renderInline(node.children, context, style.copyWith(fontWeight: FontWeight.w600));
  }

  if (node is MdDelete) {
    return renderInline(
      node.children,
      context,
      style.copyWith(
        color: context.tokens.foregroundSubtle,
        decoration: TextDecoration.lineThrough,
        decorationColor: context.tokens.foregroundSubtle,
      ),
    );
  }

  if (node is MdInlineCode) {
    return _marked(node, node.value, context, _inlineCodeStyle(context, style));
  }

  if (node is MdLink) {
    final TextStyle linked = style.copyWith(
      color: context.tokens.accent,
      decoration: TextDecoration.underline,
      decorationColor: context.tokens.accent.withValues(alpha: 0.4),
    );
    final void Function(String, String?)? tap = context.onLinkTap;
    final InlineSpan inside = renderInline(node.children, context, linked);

    if (tap == null) {
      return inside;
    }

    // Keyed by where the link starts in the document, which is what makes the
    // same link across two builds the same link — and so the same recognizer,
    // rather than a new one per frame for every link on the page.
    final GestureRecognizer? recognizer = context.recognizerFor?.call(
      node.range.start,
      () => tap(node.url, node.title),
    );

    if (recognizer == null) {
      return inside;
    }

    return _recognized(inside, recognizer);
  }

  if (node is MdImage) {
    return WidgetSpan(
      alignment: PlaceholderAlignment.middle,
      child: _Image(node: node, context: context),
    );
  }

  if (node is MdFootnoteReference) {
    final MdFootnoteDefinition? footnote = context.footnotes[node.label];

    // A reference with nothing to point at should not have reached here: the
    // inline parser only makes one for a label the document defines.
    if (footnote == null) {
      return const TextSpan(text: '');
    }

    return TextSpan(
      text: '${footnote.number}',
      style: style.copyWith(
        color: context.tokens.accent,
        fontSize: (style.fontSize ?? _em(context)) * 0.78,
        fontFeatures: const <FontFeature>[FontFeature.superscripts()],
      ),
    );
  }

  if (node is MdBreak) {
    return const TextSpan(text: '\n');
  }

  if (node is MdTextDirective) {
    final MawyDirectiveBuilder? builder = context.directives?[node.name];
    final String source = _sourceOf(node.range, context);

    if (builder == null) {
      return TextSpan(text: source, style: _unclaimedStyle(context, style));
    }

    return WidgetSpan(
      alignment: PlaceholderAlignment.middle,
      child: _Directive(
        builder: builder,
        directive: MawyDirective(
          name: node.name,
          kind: MawyDirectiveKind.text,
          attributes: node.attributes,
          label: node.children.isEmpty ? null : renderInline(node.children, context, style),
          children: null,
          range: node.range,
          source: source,
        ),
      ),
    );
  }

  if (node is MdInlineHtml) {
    // Flutter has no HTML to draw this as, so it is the characters it was
    // written with. That is not a policy chosen between — there is nothing else
    // it could be.
    return TextSpan(
      text: node.value,
      style: _codeStyle(context, style).copyWith(
        color: context.tokens.foregroundMuted,
        backgroundColor: context.tokens.backgroundSunken,
      ),
    );
  }

  return const TextSpan(text: '');
}

/// The same span tree with a recognizer on every run of text in it.
///
/// A recognizer on a span that has children and no text of its own does
/// nothing: it is consulted for the characters that span draws, and a span with
/// no text draws none. So it goes on the leaves, which is where the words are.
InlineSpan _recognized(InlineSpan span, GestureRecognizer recognizer) {
  if (span is! TextSpan) {
    return span;
  }

  return TextSpan(
    text: span.text,
    style: span.style,
    recognizer: span.text == null ? null : recognizer,
    children: span.children
        ?.map((InlineSpan child) => _recognized(child, recognizer))
        .toList(growable: false),
  );
}

/// The bytes a `data:` URL carries, or `null` when it is not one.
///
/// The URL policy allows a `data:` image on purpose — a document that carries
/// its own illustrations is most of the point of a Markdown file being one
/// file — and `Image.network` cannot open one anywhere but the web, where it
/// happens to become an `<img>` tag. So the bytes are read here and drawn from
/// memory, and the picture arrives on every platform rather than on one of
/// them.
Uint8List? _dataBytes(String url) {
  final String trimmed = url.trim();

  if (!trimmed.toLowerCase().startsWith('data:')) {
    return null;
  }

  try {
    return UriData.parse(trimmed).contentAsBytes();
  } on Object {
    // Not a data URL this can read. The error builder says so, which is what
    // it says about a picture that will not load for any other reason.
    return null;
  }
}

class _Image extends StatefulWidget {
  const _Image({required this.node, required this.context});

  final MdImage node;
  final MawyRenderContext context;

  @override
  State<_Image> createState() => _ImageState();
}

class _ImageState extends State<_Image> {
  /// Decoded once rather than on every build: this widget is made again every
  /// time the document is drawn, and a base64 illustration is megabytes.
  Uint8List? _bytes;

  @override
  void initState() {
    super.initState();
    _bytes = _dataBytes(widget.node.url);
  }

  @override
  void didUpdateWidget(_Image old) {
    super.didUpdateWidget(old);

    if (widget.node.url != old.node.url) {
      _bytes = _dataBytes(widget.node.url);
    }
  }

  @override
  Widget build(BuildContext buildContext) {
    final MdImage node = widget.node;
    final MawyRenderContext context = widget.context;
    final MawyImageBuilder? builder = context.imageBuilder;

    // Handed over whole rather than fetched here. Which pictures are worth
    // fetching, and with what on the request, is the application's answer.
    if (builder != null) {
      return builder(buildContext, MawyImage(url: node.url, alt: node.alt, title: node.title));
    }

    final Widget Function(String)? onError = context.onImageError;

    Widget refused(BuildContext _, Object _, StackTrace? _) =>
        onError?.call(node.url) ??
        Text(
          node.alt.isEmpty ? node.url : node.alt,
          style: context.body.copyWith(color: context.tokens.foregroundSubtle),
        );

    return ClipRRect(
      borderRadius: BorderRadius.circular(MawyRadius.medium),
      child: LayoutBuilder(
        builder: (BuildContext layout, BoxConstraints room) {
          // How many device pixels wide the picture can be drawn at, so that a
          // photograph four thousand across is not decoded at four thousand to
          // be shown at six hundred. A decoded bitmap is four bytes a pixel and
          // it is that rather than the file that fills a phone's memory.
          final int? cache = room.maxWidth.isFinite && room.maxWidth > 0
              ? (room.maxWidth * MediaQuery.devicePixelRatioOf(layout)).round()
              : null;
          // `![](…)` is a picture the author said nothing about, which in
          // Markdown — and in the `alt=""` it becomes — means decoration. Left
          // in the tree it is an unnamed image, and a screen reader stops on it
          // to say "image" and nothing else. Said or skipped, and never named
          // nothing.
          final String? label = node.alt.isEmpty ? null : node.alt;
          final bool unnamed = node.alt.isEmpty;

          return _bytes == null
              ? Image.network(
                  node.url,
                  cacheWidth: cache,
                  semanticLabel: label,
                  excludeFromSemantics: unnamed,
                  errorBuilder: refused,
                )
              : Image.memory(
                  _bytes!,
                  cacheWidth: cache,
                  semanticLabel: label,
                  excludeFromSemantics: unnamed,
                  errorBuilder: refused,
                );
        },
      ),
    );
  }
}

/* -------------------------------------------------------------------------
 * Blocks
 * ---------------------------------------------------------------------- */

/// The font sizes and weights the six heading levels are drawn at, as
/// multiples of the body size — the React package's own numbers.
const List<double> _headingScale = <double>[1.9, 1.45, 1.2, 1.05, 1, 1];

/// A run of blocks, one under the other.
///
/// [tight] is a list that has no blank lines in it: its items' paragraphs are
/// the words rather than a paragraph around them, so nothing is spaced.
List<Widget> renderBlocks(List<MdBlock> blocks, MawyRenderContext context, {bool tight = false}) {
  final List<Widget> out = <Widget>[];

  for (int index = 0; index < blocks.length; index += 1) {
    out.add(
      _block(
        blocks[index],
        context,
        tight: tight,
        first: index == 0,
        last: index == blocks.length - 1,
      ),
    );
  }

  return out;
}

/// Every line of a paragraph the same height, whatever is on it.
///
/// Without this a line of Hangul and a line of Latin inside one paragraph are
/// two different heights, because the two are drawn from two different fonts
/// and a line box is as tall as what is on it. That is not what a browser does
/// — `line-height` is the line there and a fallback font does not get a vote —
/// and it is what made a selection across a paragraph a ragged stack of blocks
/// rather than a run of text.
///
/// [forceHeight] is what makes it a height rather than a minimum, and it is off
/// for a line with a widget on it. A picture and an inline directive arrive as
/// placeholders in the middle of the text, and a line held to the height of a
/// line of text cannot hold one: the widget is centred on the line and paints
/// out of both ends of it, over the paragraph above and the paragraph below.
/// A browser grows the line instead, and so does this — for that paragraph
/// only, which is the one place the ragged-line argument above does not reach,
/// because a paragraph with a photograph in it is not a run of even lines
/// whatever the strut says.
StrutStyle mawyStrutFor(TextStyle style, {bool forceHeight = true}) => StrutStyle(
  fontFamily: style.fontFamily,
  fontFamilyFallback: style.fontFamilyFallback,
  fontSize: style.fontSize,
  height: style.height,
  forceStrutHeight: forceHeight,
  // Half the leading above and half below, which is what CSS does with
  // `line-height` and so what the React package's paragraphs do. Flutter's
  // default splits it in proportion to the font's own ascent and descent, so
  // where a baseline sits inside a line depends on which font drew the line —
  // and a paragraph of Hangul beside a paragraph of Latin is two fonts.
  leadingDistribution: TextLeadingDistribution.even,
);

/// Whether [span] puts a widget on a line, at any depth.
///
/// A picture is one, and so is an inline directive the application drew — both
/// arrive as a `WidgetSpan`, and both can be taller than the text they sit in.
/// Asked of the built span rather than of the nodes it came from, so a widget
/// that arrives some other way later is not a case somebody has to remember to
/// add here.
bool _carriesWidget(InlineSpan span) {
  bool found = false;

  span.visitChildren((InlineSpan child) {
    found = found || child is WidgetSpan;

    return !found;
  });

  return found;
}

/// A margin below a block, unless it is the last thing in whatever holds it.
Widget _spaced(Widget child, double bottom, {required bool last}) {
  return last
      ? child
      : Padding(
          padding: EdgeInsets.only(bottom: bottom),
          child: child,
        );
}

Widget _block(
  MdBlock block,
  MawyRenderContext context, {
  required bool tight,
  required bool first,
  required bool last,
}) {
  final MawyTokens tokens = context.tokens;
  final double em = _em(context);

  if (block is MdHeading) {
    final double scale = _headingScale[block.depth - 1];
    final TextStyle style = context.body.copyWith(
      fontSize: em * scale,
      fontWeight: FontWeight.w600,
      height: 1.3,
      letterSpacing: -0.014 * em * scale,
      color: block.depth >= 5 ? tokens.foregroundMuted : tokens.foreground,
    );
    final InlineSpan span = renderInline(block.children, context, style);
    final Widget text = Text.rich(
      span,
      strutStyle: mawyStrutFor(style, forceHeight: !_carriesWidget(span)),
    );

    return Padding(
      // `2em 0 0.6em`, and no top margin on the first thing in a document.
      padding: EdgeInsets.only(top: first ? 0 : em * 2, bottom: last ? 0 : em * 0.6),
      // Said rather than only drawn. The React package writes an `<h2>` and a
      // screen reader gets the level for nothing; here a heading is text at a
      // larger size, and text at a larger size is text. Moving through a
      // document by its headings is most of how a document is read without
      // sight, and it did not work at all.
      child: Semantics(
        header: true,
        headingLevel: block.depth,
        child: block.depth == 2
            ? Container(
                padding: EdgeInsets.only(bottom: em * 0.3),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: tokens.border)),
                ),
                width: double.infinity,
                child: text,
              )
            : text,
      ),
    );
  }

  if (block is MdParagraph) {
    final InlineSpan span = renderInline(block.children, context, context.body);
    final Widget text = Text.rich(
      span,
      strutStyle: mawyStrutFor(context.body, forceHeight: !_carriesWidget(span)),
    );

    return tight ? text : _spaced(text, em, last: last);
  }

  if (block is MdCode) {
    return _spaced(
      _CodeBlock(block: block, context: context),
      em * 1.2,
      last: last,
    );
  }

  if (block is MdBlockquote) {
    return _spaced(
      _Quote(block: block, context: context),
      em,
      last: last,
    );
  }

  if (block is MdList) {
    return _spaced(
      _List(block: block, context: context),
      em,
      last: last,
    );
  }

  if (block is MdTable) {
    return _spaced(
      _Table(block: block, context: context),
      em * 1.2,
      last: last,
    );
  }

  if (block is MdDefinitionList) {
    return _spaced(
      _Definitions(block: block, context: context),
      em,
      last: last,
    );
  }

  if (block is MdThematicBreak) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: em * 2.2),
      child: Container(height: 1, color: tokens.border),
    );
  }

  if (block is MdContainerDirective) {
    return _spaced(
      _directive(
        context,
        name: block.name,
        kind: MawyDirectiveKind.container,
        attributes: block.attributes,
        label: block.label,
        children: renderBlocks(block.children, context),
        range: block.range,
      ),
      em,
      last: last,
    );
  }

  if (block is MdLeafDirective) {
    return _spaced(
      _directive(
        context,
        name: block.name,
        kind: MawyDirectiveKind.leaf,
        attributes: block.attributes,
        label: block.children,
        children: null,
        range: block.range,
      ),
      em,
      last: last,
    );
  }

  if (block is MdHtmlBlock) {
    // The markup, as the characters it is. See `_inlineSpan`.
    return _spaced(_unclaimed(block.value, context), em, last: last);
  }

  return const SizedBox.shrink();
}

/* -------------------------------------------------------------------------
 * Code
 * ---------------------------------------------------------------------- */

/// The code, coloured if there is anything to colour it with.
///
/// One span when there is not, which is the same drawing the block had before
/// a highlighter was ever an argument.
InlineSpan _code(String code, String? lang, MawyRenderContext context, TextStyle style) {
  final MawyHighlighter? highlighter = context.highlighter;

  if (highlighter == null || lang == null || code.isEmpty || !highlighter.supports(lang)) {
    return TextSpan(text: code, style: style);
  }

  final List<MawyCodeToken> tokens = highlighter.highlight(code, lang);

  // Tokens, checked against the code they claim to be. A highlighter that drops
  // a character or invents one would have the screen showing something the
  // document does not say, and colour is not worth that — so tokens that do not
  // join back into the code exactly are thrown away and the block is drawn
  // plain.
  if (tokens.map((MawyCodeToken token) => token.text).join() != code) {
    return TextSpan(text: code, style: style);
  }

  return TextSpan(
    style: style,
    children: <InlineSpan>[
      for (final MawyCodeToken token in tokens)
        TextSpan(text: token.text, style: _codeColour(token.kind, context.tokens)),
    ],
  );
}

/// Which of the eight colours a name is drawn in.
///
/// Thirteen names and eight colours, exactly as `styles.css` pairs them: a
/// palette with a separate colour for every name is a code block nobody reads.
TextStyle? _codeColour(MawyCodeTokenKind? kind, MawyTokens tokens) => switch (kind) {
  null => null,
  MawyCodeTokenKind.comment => TextStyle(
    color: tokens.highlightComment,
    fontStyle: FontStyle.italic,
  ),
  MawyCodeTokenKind.string || MawyCodeTokenKind.regex => TextStyle(color: tokens.highlightString),
  MawyCodeTokenKind.number ||
  MawyCodeTokenKind.constant => TextStyle(color: tokens.highlightNumber),
  MawyCodeTokenKind.keyword => TextStyle(color: tokens.highlightKeyword),
  MawyCodeTokenKind.type => TextStyle(color: tokens.highlightType),
  MawyCodeTokenKind.function || MawyCodeTokenKind.tag => TextStyle(color: tokens.highlightFunction),
  MawyCodeTokenKind.variable ||
  MawyCodeTokenKind.attribute => TextStyle(color: tokens.highlightVariable),
  MawyCodeTokenKind.operator ||
  MawyCodeTokenKind.punctuation => TextStyle(color: tokens.highlightPunctuation),
};

class _CodeBlock extends StatefulWidget {
  const _CodeBlock({required this.block, required this.context});

  final MdCode block;
  final MawyRenderContext context;

  @override
  State<_CodeBlock> createState() => _CodeBlockState();
}

class _CodeBlockState extends State<_CodeBlock> with MawyCopying<_CodeBlock> {
  @override
  Widget build(BuildContext buildContext) {
    final MawyRenderContext context = widget.context;
    final MawyTokens tokens = context.tokens;
    final double em = _em(context);
    final String? lang = widget.block.lang;

    return Stack(
      children: <Widget>[
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: tokens.codeBackground,
            borderRadius: BorderRadius.circular(MawyRadius.medium),
            border: Border.all(color: tokens.border),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.fromLTRB(
              em * 1.05,
              // The language sits above the code rather than beside it, so the
              // block makes room for it when there is one.
              lang == null ? em * 0.95 : em * 2.1,
              em * 1.05,
              em * 0.95,
            ),
            child: Text.rich(
              _code(
                widget.block.value,
                lang,
                context,
                _codeStyle(
                  context,
                  context.body,
                ).copyWith(backgroundColor: null, fontSize: em * 0.855, height: 1.6),
              ),
            ),
          ),
        ),
        if (lang != null)
          Positioned(
            top: em * 0.65,
            left: em * 1.05,
            // A label rather than a chip: it is there to be read when it is
            // looked for, and to be quiet the rest of the time.
            child: Text(
              lang.toUpperCase(),
              style: _codeStyle(context, context.body).copyWith(
                backgroundColor: null,
                color: tokens.foregroundSubtle,
                fontSize: em * 0.7,
                letterSpacing: em * 0.04,
              ),
            ),
          ),
        Positioned(
          top: 6,
          right: 6,
          child: _IconButton(
            icon: switch (copyState) {
              MawyCopyState.copied => LucideIcons.check,
              MawyCopyState.failed => LucideIcons.x,
              MawyCopyState.idle => LucideIcons.copy,
            },
            label: switch (copyState) {
              MawyCopyState.copied => context.strings.copied,
              MawyCopyState.failed => context.strings.copyFailed,
              MawyCopyState.idle => context.strings.copyCode,
            },
            tokens: tokens,
            active: copyState == MawyCopyState.copied,
            onPressed: () => copy(widget.block.value),
          ),
        ),
      ],
    );
  }
}

/* -------------------------------------------------------------------------
 * Quotations and alerts
 * ---------------------------------------------------------------------- */

const Map<MdAlertKind, IconData> _alertIcons = <MdAlertKind, IconData>{
  MdAlertKind.note: LucideIcons.info,
  MdAlertKind.tip: LucideIcons.lightbulb,
  MdAlertKind.important: LucideIcons.circleAlert,
  MdAlertKind.warning: LucideIcons.triangleAlert,
  MdAlertKind.caution: LucideIcons.octagonAlert,
};

class _Quote extends StatelessWidget {
  const _Quote({required this.block, required this.context});

  final MdBlockquote block;
  final MawyRenderContext context;

  Color _alertColor() => switch (block.alert!) {
    MdAlertKind.note => context.tokens.note,
    MdAlertKind.tip => context.tokens.tip,
    MdAlertKind.important => context.tokens.important,
    MdAlertKind.warning => context.tokens.warning,
    MdAlertKind.caution => context.tokens.caution,
  };

  String _alertLabel() => switch (block.alert!) {
    MdAlertKind.note => context.strings.alertNote,
    MdAlertKind.tip => context.strings.alertTip,
    MdAlertKind.important => context.strings.alertImportant,
    MdAlertKind.warning => context.strings.alertWarning,
    MdAlertKind.caution => context.strings.alertCaution,
  };

  @override
  Widget build(BuildContext buildContext) {
    final double em = _em(context);
    final MdAlertKind? alert = block.alert;

    if (alert == null) {
      return Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(em * 1.1, em * 0.15, 0, em * 0.15),
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: context.tokens.borderStrong, width: 3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: renderBlocks(
            block.children,
            MawyRenderContext(
              tokens: context.tokens,
              typography: context.typography,
              strings: context.strings,
              body: context.body.copyWith(color: context.tokens.foregroundMuted),
              footnotes: context.footnotes,
              onLinkTap: context.onLinkTap,
              onImageError: context.onImageError,
              imageBuilder: context.imageBuilder,
              recognizerFor: context.recognizerFor,
            ),
          ),
        ),
      );
    }

    final Color colour = _alertColor();

    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: em * 1.1, vertical: em * 0.85),
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.07),
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(MawyRadius.medium)),
        border: Border(left: BorderSide(color: colour, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: EdgeInsets.only(bottom: em * 0.4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(_alertIcons[alert], size: em, color: colour),
                SizedBox(width: em * 0.45),
                Text(
                  _alertLabel(),
                  style: context.body.copyWith(color: colour, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          ...renderBlocks(block.children, context),
        ],
      ),
    );
  }
}

/* -------------------------------------------------------------------------
 * Lists
 * ---------------------------------------------------------------------- */

class _List extends StatelessWidget {
  const _List({required this.block, required this.context});

  final MdList block;
  final MawyRenderContext context;

  @override
  Widget build(BuildContext buildContext) {
    final double em = _em(context);
    final bool tight = !block.loose;
    final List<Widget> rows = <Widget>[];

    for (int index = 0; index < block.children.length; index += 1) {
      final MdListItem item = block.children[index];
      final bool task = item.checked != null;

      rows.add(
        Padding(
          padding: EdgeInsets.symmetric(vertical: em * 0.25),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              SizedBox(
                width: em * 1.5,
                child: task
                    ? Padding(
                        // Down the middle of the first line, which is the line
                        // box and not the glyphs in it: a box `em` tall inside
                        // one `em * lineHeight` tall has half the difference
                        // above it. A number written by hand was right at one
                        // line height and above the text at every other.
                        padding: EdgeInsets.only(top: em * (context.typography.lineHeight - 1) / 2),
                        child: Icon(
                          item.checked! ? LucideIcons.squareCheck : LucideIcons.square,
                          size: em,
                          color: item.checked!
                              ? context.tokens.accent
                              : context.tokens.foregroundSubtle,
                        ),
                      )
                    : Text(
                        block.ordered ? '${block.start + index}.' : '•',
                        style: context.body.copyWith(color: context.tokens.foregroundSubtle),
                      ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: renderBlocks(item.children, context, tight: tight),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows);
  }
}

/* -------------------------------------------------------------------------
 * Tables
 * ---------------------------------------------------------------------- */

class _Table extends StatelessWidget {
  const _Table({required this.block, required this.context});

  final MdTable block;
  final MawyRenderContext context;

  TextAlign _align(int column) {
    final MdAlign? align = column < block.align.length ? block.align[column] : null;

    return switch (align) {
      MdAlign.center => TextAlign.center,
      MdAlign.right => TextAlign.right,
      MdAlign.left => TextAlign.left,
      null => TextAlign.start,
    };
  }

  @override
  Widget build(BuildContext buildContext) {
    final MawyTokens tokens = context.tokens;
    final double em = _em(context);
    final TextStyle cellStyle = context.body.copyWith(fontSize: em * 0.94);
    int body = 0;

    // As wide as what holds it, and wider only where the columns need it —
    // which is `width: 100%` inside an `overflow-x: auto`, said in Flutter. The
    // width was the *window's* before, so a table in one pane of `split` was
    // half a screen too wide and scrolled sideways whatever was in it.
    return LayoutBuilder(
      builder: (BuildContext _, BoxConstraints room) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: BoxConstraints(minWidth: room.hasBoundedWidth ? room.maxWidth : 0),
          child: Table(
            border: TableBorder.all(color: tokens.border),
            defaultColumnWidth: const IntrinsicColumnWidth(),
            children: block.children.map((MdTableRow row) {
              final bool striped = !row.header && body++ % 2 == 1;

              return TableRow(
                decoration: BoxDecoration(
                  color: row.header
                      ? tokens.backgroundSunken
                      : (striped ? tokens.backgroundSunken.withValues(alpha: 0.55) : null),
                ),
                children: row.children.asMap().entries.map((MapEntry<int, MdTableCell> cell) {
                  return Padding(
                    padding: EdgeInsets.symmetric(horizontal: em * 0.8, vertical: em * 0.5),
                    child: Text.rich(
                      renderInline(
                        cell.value.children,
                        context,
                        row.header ? cellStyle.copyWith(fontWeight: FontWeight.w600) : cellStyle,
                      ),
                      textAlign: _align(cell.key),
                    ),
                  );
                }).toList(),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------
 * Definition lists
 * ---------------------------------------------------------------------- */

class _Definitions extends StatelessWidget {
  const _Definitions({required this.block, required this.context});

  final MdDefinitionList block;
  final MawyRenderContext context;

  @override
  Widget build(BuildContext buildContext) {
    final double em = _em(context);
    final List<Widget> rows = <Widget>[];

    for (int index = 0; index < block.children.length; index += 1) {
      final MdNode child = block.children[index];
      final bool afterTerm = index > 0 && block.children[index - 1] is MdDefinitionTerm;

      if (child is MdDefinitionTerm) {
        rows.add(
          Padding(
            padding: EdgeInsets.only(top: index == 0 || afterTerm ? 0 : em * 0.9),
            child: Text.rich(
              renderInline(
                child.children,
                context,
                context.body.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
        );
        continue;
      }

      if (child is MdDefinitionDescription) {
        rows.add(
          Container(
            width: double.infinity,
            margin: EdgeInsets.only(top: em * 0.2),
            padding: EdgeInsets.only(left: em * 1.4),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: context.tokens.border, width: 2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: renderBlocks(child.children, context, tight: !block.loose),
            ),
          ),
        );
      }
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows);
  }
}

/* -------------------------------------------------------------------------
 * Footnotes
 * ---------------------------------------------------------------------- */

/// The footnotes, drawn under the document.
///
/// Not part of [renderBlocks], because they are not part of the block flow: a
/// footnote is written wherever it suited the author and read at the bottom, so
/// this is the one thing on the page whose place is the renderer's decision
/// rather than the document's.
Widget? renderFootnotes(List<MdFootnoteDefinition> footnotes, MawyRenderContext context) {
  if (footnotes.isEmpty) {
    return null;
  }

  final MawyTokens tokens = context.tokens;
  final double em = _em(context);
  final TextStyle small = context.body.copyWith(fontSize: em * 0.92);
  final MawyRenderContext inner = MawyRenderContext(
    tokens: tokens,
    typography: context.typography,
    strings: context.strings,
    body: small,
    footnotes: context.footnotes,
    onLinkTap: context.onLinkTap,
    onImageError: context.onImageError,
    recognizerFor: context.recognizerFor,
  );

  // Said rather than written: the rule above them and the numbers down the side
  // are what a footnote section looks like, and the word across the top is the
  // one part of it a reader does not need.
  return Semantics(
    container: true,
    // The notes keep their own nodes rather than being merged into the name of
    // the section, which is what an `aria-label` on a `<section>` does and what
    // a reader moving through them one at a time needs. Merged, the whole of
    // the footnotes is one string a screen reader reads in one breath.
    explicitChildNodes: true,
    label: context.strings.footnotes,
    child: Container(
      width: double.infinity,
      margin: EdgeInsets.only(top: em * 2.6),
      padding: EdgeInsets.only(top: em * 1.2),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: tokens.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          for (final MdFootnoteDefinition footnote in footnotes)
            Padding(
              padding: EdgeInsets.symmetric(vertical: em * 0.35),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  SizedBox(
                    width: em * 1.5,
                    child: Text(
                      '${footnote.number}.',
                      style: small.copyWith(color: tokens.foregroundSubtle),
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: renderBlocks(footnote.children, inner, tight: true),
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

/* -------------------------------------------------------------------------
 * A button, drawn the way this library draws one
 * ---------------------------------------------------------------------- */

/// An icon button built on `widgets.dart` alone.
///
/// Material has one of these and it would have been less code. It would also
/// have brought Material's theme, its ripple and its sizes into a document that
/// has a palette of its own — and a viewer that looks like Material inside a
/// Cupertino app is a viewer that looks wrong in half the places it is put.
class _IconButton extends StatefulWidget {
  const _IconButton({
    required this.icon,
    required this.label,
    required this.tokens,
    required this.onPressed,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final MawyTokens tokens;
  final VoidCallback onPressed;
  final bool active;

  @override
  State<_IconButton> createState() => _IconButtonState();
}

class _IconButtonState extends State<_IconButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final Color foreground = widget.active
        ? tokens.accent
        : (_hovered ? tokens.foreground : tokens.foregroundSubtle);

    return Semantics(
      button: true,
      label: widget.label,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (PointerEnterEvent _) => setState(() => _hovered = true),
        onExit: (PointerExitEvent _) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: MawyMotion.duration,
            curve: MawyMotion.easing,
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _hovered || widget.active ? tokens.backgroundRaised : null,
              borderRadius: BorderRadius.circular(MawyRadius.small),
              border: Border.all(
                color: _hovered || widget.active ? tokens.border : const Color(0x00000000),
              ),
            ),
            child: Icon(widget.icon, size: 15, color: foreground),
          ),
        ),
      ),
    );
  }
}
