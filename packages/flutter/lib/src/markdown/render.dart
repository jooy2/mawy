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

import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/copying.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/find.dart';
import 'package:mawy/src/markdown/url.dart';
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
    this.links = MawyLinkPolicy.show,
    this.images = MawyImagePolicy.show,
    this.imageBuilder,
    this.resolveUrl,
    this.directives,
    this.source,
    this.recognizerFor,
    this.highlighter,
    this.found,
    this.currentMatch = -1,
    this.onFootnoteTap,
    this.onFootnoteBack,
    this.footnoteKey,
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

  /// How a link the document wrote is drawn. See [MawyLinkPolicy].
  final MawyLinkPolicy links;

  /// How a picture the document asks for is drawn. See [MawyImagePolicy].
  final MawyImagePolicy images;

  /// What draws a picture, where the application would rather draw it itself.
  /// See [MawyImageBuilder].
  final MawyImageBuilder? imageBuilder;

  /// Where a relative URL points. See [MawyUrlResolver].
  ///
  /// Applied where a URL becomes something to follow — a link's destination, a
  /// picture's source — rather than in the parser, because it is the
  /// application's answer and the parser's trees are the one thing both
  /// packages have to produce identically.
  final MawyUrlResolver? resolveUrl;

  /// A URL this application has had its say about.
  ///
  /// Only the relative ones reach the resolver, and only when there is one: a
  /// document whose addresses are absolute, or an application that never said
  /// where the document came from, goes through here untouched.
  String resolved(String url, MawyUrlKind kind) =>
      resolveUrl != null && isRelativeUrl(url) ? resolveUrl!(url, kind) : url;

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

  /// What follows the number in a sentence down to the note it points at.
  ///
  /// The two halves of a footnote point at each other, and in a browser they
  /// are two links and the page does the rest. Here there is nowhere for a
  /// link to point: a span has no place of its own and the notes are drawn by
  /// this file rather than by the document. So the viewer is asked, and the
  /// viewer scrolls — the same answer the outline and the find bar arrive at,
  /// for the same reason.
  ///
  /// `null` in an editor's preview or anywhere else that is not scrolling
  /// anything, and then the number is drawn and does nothing.
  final void Function(String label)? onFootnoteTap;

  /// What goes back from a note to the first place it was mentioned.
  final void Function(String label)? onFootnoteBack;

  /// The key the note for a label is drawn under, so that whoever scrolls can
  /// find it once the section has been built. Owned by the caller, because a
  /// key made here would be a new key on every build.
  final GlobalKey Function(String label)? footnoteKey;

  /// The monospace family, which is a role rather than a font name.
  String? get monoFamily => null;

  /// This context again, with the document's body text set differently.
  ///
  /// The renderer chooses the type in two places, because in this package a
  /// style is carried rather than inherited: a quotation's paragraphs are drawn
  /// muted, and a note under the document is drawn smaller. Both used to build
  /// a second context field by field, which is a list somebody has to remember
  /// to keep whole, and both had lost some of it. A code block inside either
  /// was never coloured, a directive inside either was drawn as nothing at all,
  /// and a picture inside either went round the [imageBuilder] the application
  /// had given, which is a promise the viewer keeps everywhere else.
  ///
  /// Copying carries whatever is added to this class next without anybody
  /// having to notice, which is the part that failed twice.
  MawyRenderContext withBody(TextStyle body) => MawyRenderContext(
    tokens: tokens,
    typography: typography,
    strings: strings,
    body: body,
    footnotes: footnotes,
    onLinkTap: onLinkTap,
    links: links,
    images: images,
    imageBuilder: imageBuilder,
    resolveUrl: resolveUrl,
    directives: directives,
    source: source,
    recognizerFor: recognizerFor,
    highlighter: highlighter,
    found: found,
    currentMatch: currentMatch,
    onFootnoteTap: onFootnoteTap,
    onFootnoteBack: onFootnoteBack,
    footnoteKey: footnoteKey,
  );
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
  const _Directive({required this.directive, required this.builder, required this.body});

  final MawyDirective directive;
  final MawyDirectiveBuilder builder;

  /// The style of the words around it, for the builder to read.
  ///
  /// A React builder has this for nothing: `font: inherit` on the element it
  /// draws is the paragraph's type, so a key cap written into a document set
  /// larger grows with it. Here the type is a `TextStyle` a widget cannot see
  /// from inside a span, so it is put where `DefaultTextStyle.of` will find it.
  final TextStyle body;

  @override
  Widget build(BuildContext buildContext) =>
      DefaultTextStyle(style: body, child: builder(buildContext, directive));
}

/// The characters a node was written with, in the document: a directive nobody
/// claimed, or a link or a picture an application asked to see as its source.
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
    body: context.body,
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
  // A run the renderer cut the front off keeps the matches of the run it was
  // cut from, moved back by what was cut. See [_cellItems].
  final _CutText? cut = node is _CutText ? node : null;
  final List<MawyDocumentMatch>? matches = cut == null
      ? context.found?.at[node]
      : context.found?.at[cut.from]
            ?.map(
              (MawyDocumentMatch match) =>
                  MawyDocumentMatch(match.start - cut.skip, match.end - cut.skip, match.index),
            )
            .where((MawyDocumentMatch match) => match.start >= 0)
            .toList();

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
  if (node is _CellItem) {
    return _cellItemSpan(node, context, style);
  }

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
    switch (context.links) {
      case MawyLinkPolicy.source:
        return _marked(
          node,
          _sourceOf(node.range, context),
          context,
          _unclaimedStyle(context, style),
        );
      case MawyLinkPolicy.hide:
        return const TextSpan(text: '');
      case MawyLinkPolicy.text:
        return renderInline(node.children, context, style);
      case MawyLinkPolicy.show:
        break;
    }

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
      () => tap(context.resolved(node.url, MawyUrlKind.link), node.title),
    );

    if (recognizer == null) {
      return inside;
    }

    return _recognized(inside, recognizer);
  }

  if (node is MdImage) {
    switch (context.images) {
      case MawyImagePolicy.source:
        return _marked(
          node,
          _sourceOf(node.range, context),
          context,
          _unclaimedStyle(context, style),
        );
      case MawyImagePolicy.hide:
        return const TextSpan(text: '');
      case MawyImagePolicy.text:
        return _marked(node, node.alt, context, style);
      case MawyImagePolicy.show:
        break;
    }

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

    final TextSpan number = TextSpan(
      text: '${footnote.number}',
      style: style.copyWith(
        color: context.tokens.accent,
        fontSize: (style.fontSize ?? _em(context)) * 0.78,
        fontFeatures: const <FontFeature>[FontFeature.superscripts()],
      ),
    );
    final void Function(String)? go = context.onFootnoteTap;

    if (go == null) {
      return number;
    }

    // Keyed by where the mention starts, the way a link is: one recognizer per
    // mention, and the same one across builds.
    final GestureRecognizer? recognizer = context.recognizerFor?.call(
      node.range.start,
      () => go(node.label),
    );

    return recognizer == null ? number : _recognized(number, recognizer);
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
        body: style,
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

  /// Where the picture actually is, once the application has said.
  ///
  /// Read through here everywhere rather than from the node, because a resolver
  /// can turn a path beside the document into a `data:` URL — and then the
  /// bytes below are decoded from the answer rather than from the question.
  String get _url => widget.context.resolved(widget.node.url, MawyUrlKind.image);

  @override
  void initState() {
    super.initState();
    _bytes = _dataBytes(_url);
  }

  @override
  void didUpdateWidget(_Image old) {
    super.didUpdateWidget(old);

    if (_url != old.context.resolved(old.node.url, MawyUrlKind.image)) {
      _bytes = _dataBytes(_url);
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
      return builder(buildContext, MawyImage(url: _url, alt: node.alt, title: node.title));
    }

    // The alt text, or the address where the author wrote none. The same thing
    // a browser draws for a picture it cannot fetch, and the reason there is no
    // hook for it: an application that wants to draw something else has
    // [imageBuilder], which is handed the picture before anything is requested.
    Widget refused(BuildContext _, Object _, StackTrace? _) => Text(
      node.alt.isEmpty ? _url : node.alt,
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
                  _url,
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
            context.withBody(context.body.copyWith(color: context.tokens.foregroundMuted)),
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
          // Between the items and nowhere else, which is what `li { margin:
          // 0.25em 0 }` comes to in a browser: two margins between two items
          // collapse into one, and the one at either end of the list collapses
          // out of it. Half of the space was drawn twice and the whole list sat
          // a quarter of a line lower than the paragraph above it.
          padding: EdgeInsets.only(top: index == 0 ? 0 : em * 0.25),
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
                    : block.ordered
                    ? Text(
                        '${block.start + index}.',
                        style: context.body.copyWith(color: context.tokens.foregroundSubtle),
                      )
                    : _Bullet(em: em, context: context),
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

/// The dot in front of an item of a bulleted list.
///
/// Drawn rather than written. `\u2022` is whatever size the typeface decided to
/// draw it, which on the web is whatever font the page fell back to, and it came
/// out a good deal smaller than the one a browser draws for `list-style: disc`.
/// A circle of a known size is the same dot in every typeface and beside the
/// React package's.
///
/// Down the middle of the first line the way the task box is: the line box is
/// `em * lineHeight` tall and the dot is centred in it, which is where a
/// browser puts its own.
class _Bullet extends StatelessWidget {
  const _Bullet({required this.em, required this.context});

  final double em;
  final MawyRenderContext context;

  /// How wide a browser draws `disc`, in ems of the text it marks. Measured off
  /// one, rather than guessed at: a `disc` at 160px comes out 48 across.
  static const double _size = 0.3;

  /// How far the gutter reaches, which is the list's `padding-inline-start`.
  static const double _gutter = 1.5;

  /// What a browser leaves between the dot and the words it marks.
  static const double _gap = 0.36;

  @override
  Widget build(BuildContext buildContext) {
    final double size = em * _size;

    return Padding(
      padding: EdgeInsetsDirectional.only(
        start: em * (_gutter - _gap) - size,
        top: em * context.typography.lineHeight / 2 - size / 2,
      ),
      // The gutter is as wide as the list's own, and a box told to be that wide
      // is told it tightly: a dot inside one is stretched across it and drawn
      // down the middle of it. This holds the dot to its own size and puts it
      // where the words start, which is where a browser hangs its own.
      child: Align(
        alignment: AlignmentDirectional.topStart,
        heightFactor: 1,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(color: context.tokens.foregroundSubtle, shape: BoxShape.circle),
        ),
      ),
    );
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
        child: _TableWidth(
          room: room.hasBoundedWidth ? room.maxWidth : 0,
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
                        _cellItems(_cellContents(cell.value.children)),
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

/// A table as wide as the room it has, and wider only where its words cannot be
/// broken any smaller.
///
/// A horizontal [SingleChildScrollView] hands its child an unbounded width, and
/// an unbounded width is what [RenderTable] reads as "every column at the width
/// it would like" — which for a column of sentences is the sentence, unwrapped.
/// So the table was as wide as its longest cell whatever room it had, and the
/// scrollbar was there from the first sentence on. A browser wraps instead, and
/// scrolls only when the longest *word* of every column together is more than
/// the page has.
///
/// That is what a table already does when its width is bounded: it shrinks the
/// columns towards their minimums and the cells wrap. So the width is worked
/// out here — the room, or the sum of those minimums where even they will not
/// fit — and handed down as a tight one.
class _TableWidth extends SingleChildRenderObjectWidget {
  const _TableWidth({required this.room, required Widget super.child});

  /// How wide what holds the table is.
  final double room;

  @override
  _RenderTableWidth createRenderObject(BuildContext context) => _RenderTableWidth(room);

  @override
  void updateRenderObject(BuildContext context, _RenderTableWidth renderObject) {
    renderObject.room = room;
  }
}

class _RenderTableWidth extends RenderProxyBox {
  _RenderTableWidth(this._room);

  double _room;

  set room(double value) {
    if (_room != value) {
      _room = value;
      markNeedsLayout();
    }
  }

  @override
  void performLayout() {
    final RenderBox? inside = child;

    if (inside == null) {
      size = constraints.smallest;

      return;
    }

    final double least = inside.getMinIntrinsicWidth(double.infinity);

    inside.layout(BoxConstraints.tightFor(width: math.max(_room, least)), parentUsesSize: true);
    size = inside.size;
  }
}

/// A cell's contents, with a bare `<br>` read as the line break it is./// A cell's contents, with a bare `<br>` read as the line break it is.
///
/// In a table cell it is the only way there is to write one: a row is one line
/// of the file, so a hard break, which is a line ending, ends the row. Every
/// GitHub table with two lines in a cell is written with it, and there is
/// nothing else a `<br>` could mean there. Everywhere else raw HTML is the
/// characters it was written with, as it has always been in this package. The
/// React package reads a cell the same way, under every policy.
List<MdInline> _cellContents(List<MdInline> nodes) {
  bool breaks(MdInline node) =>
      node is MdInlineHtml &&
      RegExp(r'^<br\s*/?>$', caseSensitive: false).hasMatch(node.value.trim());

  return nodes.any(breaks)
      ? <MdInline>[for (final MdInline node in nodes) breaks(node) ? MdBreak(node.range) : node]
      : nodes;
}

/// The front of a line of a table cell written as a list item: its marker, and
/// how far in the line is nested.
///
/// Not a node the parser makes. A cell of a GitHub table holds no block, so
/// `- one<br>- two` is words to every parser, this one included, and the trees
/// both packages print for the parity check say so. The renderer draws such a
/// line the way the list it reads as would be drawn: a bullet for `-`, `*` or
/// `+`, a box for a task, the number for a numbered one, each two spaces in
/// front of the marker one step further in. GitHub draws the characters, and
/// that is the difference: the words are the same words in both. The React
/// package draws a cell the same way.
class _CellItem extends MdInline {
  _CellItem(super.range, {required this.depth, required this.checked, required this.ordinal});

  /// How many steps in, at two spaces a step.
  final int depth;

  /// `true` or `false` for a task, `null` for any other item.
  final bool? checked;

  /// What a numbered item is numbered, `null` for a bullet.
  final String? ordinal;
}

/// A run of text with its front cut off, and the run it was cut from. See [_marked].
class _CutText extends MdText {
  _CutText(super.range, super.value, {required this.from, required this.skip});

  final MdInline from;
  final int skip;
}

/// A list item's marker at the start of a line of a cell. See [_CellItem].
final RegExp _cellItem = RegExp(r'^( *)(?:[-*+] (?:\[([ xX])\] )?|(\d{1,9}[.)]) )');

/// The bullets a nested list steps through.
const List<String> _bullets = <String>['\u2022', '\u25e6', '\u25aa'];

/// A cell's contents with the front of each line written as a list item drawn
/// as one. See [_CellItem].
///
/// Only a line with something after its marker: `- ` on its own is a dash
/// somebody is part of the way through typing, and `| - |` is how a great many
/// tables say there is nothing in a cell.
List<MdInline> _cellItems(List<MdInline> nodes) {
  final List<MdInline> out = <MdInline>[];
  bool starts = true;

  for (int index = 0; index < nodes.length; index += 1) {
    final MdInline node = nodes[index];
    final MdInline? next = index + 1 < nodes.length ? nodes[index + 1] : null;
    final RegExpMatch? found = starts && node is MdText ? _cellItem.firstMatch(node.value) : null;

    starts = node is MdBreak;

    if (found == null ||
        node is! MdText ||
        (node.value.length == found.end && (next == null || next is MdBreak))) {
      out.add(node);
      continue;
    }

    final int end = node.range.start + found.end;

    out.add(
      _CellItem(
        MdRange(node.range.start, end),
        depth: found.group(1)!.length ~/ 2,
        checked: found.group(2) == null ? null : found.group(2) != ' ',
        ordinal: found.group(3),
      ),
    );

    if (node.value.length > found.end) {
      out.add(
        _CutText(
          MdRange(end, node.range.end),
          node.value.substring(found.end),
          from: node,
          skip: found.end,
        ),
      );
    }
  }

  return out;
}

InlineSpan _cellItemSpan(_CellItem item, MawyRenderContext context, TextStyle style) {
  final double em = style.fontSize ?? _em(context);
  final Color muted = context.tokens.foregroundSubtle;
  final Widget mark = item.checked == null
      ? Text(
          item.ordinal ?? _bullets[item.depth % _bullets.length],
          style: style.copyWith(color: muted),
        )
      : Icon(
          item.checked! ? LucideIcons.squareCheck : LucideIcons.square,
          size: em,
          color: item.checked! ? context.tokens.accent : muted,
        );

  return WidgetSpan(
    alignment: PlaceholderAlignment.middle,
    child: Padding(
      padding: EdgeInsetsDirectional.only(start: item.depth * em * 1.25, end: em * 0.35),
      child: mark,
    ),
  );
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

/// What a note says, with the way back at the end of it.
///
/// The arrow goes inside the last paragraph rather than under it, which is
/// where the React package puts it and what a footnote nearly always ends with:
/// on a line of its own it reads as another sentence rather than as the end of
/// this one. A note ending in a list or a code block gets its own line, because
/// there is no line to put it on.
List<Widget> _note(MdFootnoteDefinition footnote, MawyRenderContext context) {
  final void Function(String)? back = context.onFootnoteBack;

  if (back == null) {
    return renderBlocks(footnote.children, context, tight: true);
  }

  // The arrow the React package writes as a character, drawn from the icon font
  // this package already ships. `\u21a9` is not in a web build's fonts and has
  // an emoji form besides, so what arrived on the page was a coloured box; an
  // icon is the same shape everywhere. Down and to the left, which is the way
  // `\u21a9` is drawn — its tail rises to the right — and the mirror of the one
  // that was here, which pointed back the other way. As a span rather than as an `Icon`,
  // because a span sits on the line the sentence ends on and can be tapped
  // through the same path a link is.
  const IconData mark = LucideIcons.cornerDownLeft;
  final double size = (context.body.fontSize ?? _em(context)) * 0.9;
  final TextSpan arrow = TextSpan(
    text: ' ${String.fromCharCode(mark.codePoint)}',
    style: context.body.copyWith(
      fontFamily: mark.fontFamily,
      package: mark.fontPackage,
      fontSize: size,
      color: context.tokens.accent,
    ),
    semanticsLabel: context.strings.footnoteBack,
    recognizer: context.recognizerFor?.call(footnote.range.start, () => back(footnote.label)),
  );
  final List<MdBlock> blocks = footnote.children;
  final MdBlock? last = blocks.isEmpty ? null : blocks.last;

  if (last is! MdParagraph) {
    return <Widget>[...renderBlocks(blocks, context, tight: true), Text.rich(arrow)];
  }

  final InlineSpan span = TextSpan(
    children: <InlineSpan>[renderInline(last.children, context, context.body), arrow],
  );

  return <Widget>[
    ...renderBlocks(blocks.sublist(0, blocks.length - 1), context, tight: true),
    Text.rich(span, strutStyle: mawyStrutFor(context.body, forceHeight: !_carriesWidget(span))),
  ];
}

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
  // Smaller type and nothing else. A note is a place a footnote can be
  // mentioned like any other, a code block in one is a code block, and the
  // find bar carries through harmlessly: it does not search a note, so it has
  // nothing to say about any run in here, and it will have if it ever does.
  final MawyRenderContext inner = context.withBody(small);

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
              // Keyed so that whoever followed a mention here can find the note
              // itself once this section has been built. The whole section is
              // one measured block, so the ledger can say where the notes begin
              // and nothing else.
              key: context.footnoteKey?.call(footnote.label),
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
                      children: _note(footnote, inner),
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
