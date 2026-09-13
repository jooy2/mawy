/// The vocabulary every part of Mawy is written in.
///
/// These are the types more than one widget needs, which is why they sit here
/// rather than beside whichever widget introduced them — and they are the React
/// package's types under the same names, so an application that has read one
/// has read the other.
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/src/markdown/ast.dart' show MdRange;

/// The highlighter's vocabulary, which is deliberately in a file of its own —
/// see `src/code.dart`. It is re-exported here so that an application still has
/// one place to read the whole of it from.
export 'package:mawy/src/code.dart';

/// How a link and a picture are drawn, in a file of its own for the same
/// reason: the find bar's walk reads it, and `tool/parity.dart` runs that walk.
export 'package:mawy/src/drawing.dart';

/// Which palette to draw in.
///
/// [system] follows the platform's own brightness, which is the default: a
/// viewer embedded in an application that already answers that question should
/// not be the one white rectangle on a dark screen.
enum MawyColorScheme {
  /// Always light.
  light,

  /// Always dark.
  dark,

  /// Whatever the platform says.
  system,
}

/// Which typeface the document is set in.
///
/// Three roles rather than font names: the package ships no typefaces and
/// should not pretend to. Each maps to the platform's own family for that role
/// unless an application names its own through [MawyTypography.fontFamilyName].
enum MawyFontFamily {
  /// The reader's sans-serif.
  sans,

  /// The reader's serif.
  serif,

  /// The reader's monospace.
  mono,
}

/// How wide the text is allowed to run.
///
/// A line that is too long is the failure that arrives with a larger text size:
/// turn the size up on a full-width document and every line becomes harder to
/// come back to. [full] is for a viewer that has been given a column of its own
/// and does not need a second one inside it.
enum MawyMeasure {
  /// About 34 characters to the em.
  narrow,

  /// The default.
  normal,

  /// Wider.
  wide,

  /// As wide as it is given.
  full,
}

/// The widest a column of text may be, in logical pixels.
extension MawyMeasureWidth on MawyMeasure {
  /// `null` for [MawyMeasure.full], which is not a width at all.
  double? get width => switch (this) {
    MawyMeasure.narrow => 560,
    MawyMeasure.normal => 704,
    MawyMeasure.wide => 880,
    MawyMeasure.full => null,
  };
}

/// How the document is set.
///
/// Every field has a default, so `MawyTypography(fontSize: 18)` is a whole
/// answer and the rest stays where it was.
class MawyTypography {
  /// Creates a set of typographic settings.
  const MawyTypography({
    this.fontFamily = MawyFontFamily.sans,
    this.fontFamilyName,
    this.fontSize = 16,
    this.lineHeight = 1.7,
    this.letterSpacing = 0,
    this.measure = MawyMeasure.normal,
  });

  /// Which of the three roles the document is set in.
  final MawyFontFamily fontFamily;

  /// A family name to use instead of the platform's own for that role.
  ///
  /// The package ships no fonts. An application that wants a particular face
  /// bundles it and names it here.
  final String? fontFamilyName;

  /// The body size, in logical pixels. Everything else is relative to it.
  final double fontSize;

  /// Unitless, so it scales with the size the way a line height should.
  final double lineHeight;

  /// In ems. Negative tightens.
  final double letterSpacing;

  /// How wide the text may run.
  final MawyMeasure measure;

  /// The same settings with whatever is named here changed.
  MawyTypography copyWith({
    MawyFontFamily? fontFamily,
    String? fontFamilyName,
    double? fontSize,
    double? lineHeight,
    double? letterSpacing,
    MawyMeasure? measure,
  }) {
    return MawyTypography(
      fontFamily: fontFamily ?? this.fontFamily,
      fontFamilyName: fontFamilyName ?? this.fontFamilyName,
      fontSize: fontSize ?? this.fontSize,
      lineHeight: lineHeight ?? this.lineHeight,
      letterSpacing: letterSpacing ?? this.letterSpacing,
      measure: measure ?? this.measure,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is MawyTypography &&
      other.fontFamily == fontFamily &&
      other.fontFamilyName == fontFamilyName &&
      other.fontSize == fontSize &&
      other.lineHeight == lineHeight &&
      other.letterSpacing == letterSpacing &&
      other.measure == measure;

  @override
  int get hashCode =>
      Object.hash(fontFamily, fontFamilyName, fontSize, lineHeight, letterSpacing, measure);
}

/// Whether the surface has a frame around it, or floats in the page.
///
/// - [box] — the default. The toolbar is a bar across one end of the surface
///   with a line under it, and the whole thing is drawn on a background of its
///   own. A reader can see where the viewer starts and the screen around it
///   stops, which is what a document being looked at *inside* a larger screen
///   wants.
/// - [floating] — nothing wraps the document. No border, no bar across the end,
///   and the toolbar is a rounded group over the top or the bottom of the text,
///   the way the platform puts its controls over what they act on.
///
/// The ground stays under the document either way, because a palette that
/// reaches the text and not what it sits on is half a palette — a reader who
/// picks dark would get light grey on whatever the application drew. Passing
/// `tokens` with a transparent `background` is how an application says it wants
/// the document on its own ground instead.
///
/// The room around the prose follows. [MawyViewer.padding] unset is the usual
/// `28, 40, 28, 96` under [box] and nothing at all under [floating], because a
/// screen that draws its own margins does not want a second set inside them.
/// Passing a padding says which, either way.
enum MawyFrame {
  /// A surface, with the toolbar barred across one end of it.
  box,

  /// The document, with the toolbar over it.
  floating,
}

/// Which end of the surface the toolbar is at.
///
/// Under [MawyFrame.box] it is a bar with its line on the other side. Under
/// [MawyFrame.floating] it is which edge the rounded bar hovers over —
/// [bottom] is where a thumb is on a phone, and [top] is where a pointer
/// expects a toolbar.
///
/// The editor's status line is not a toolbar and does not move; it is the
/// bottom edge of the editor either way.
enum MawyToolbarPlacement {
  /// Above the document.
  top,

  /// Below it.
  bottom,
}

/// One control on the viewer's toolbar.
enum MawyViewerToolbarItem {
  /// The typeface menu.
  fontFamily,

  /// Text size.
  fontSize,

  /// Line height.
  lineHeight,

  /// Letter spacing.
  letterSpacing,

  /// How wide the column runs.
  measure,

  /// Light, dark, or whatever the platform says.
  colorScheme,

  /// The outline of the headings.
  outline,

  /// The find bar.
  find,

  /// The document's source, to the clipboard.
  copy,

  /// A hairline, for grouping.
  separator,
}

/// Which of the three shapes a directive was written in.
///
/// The number of colons is the difference and nothing else about it is:
/// `:::container` holds blocks, `::leaf` is a line of its own, and `:text` sits
/// inside a sentence.
enum MawyDirectiveKind {
  /// `:::name[label]{attrs}` … `:::`, with blocks inside it.
  container,

  /// `::name[label]{attrs}` on a line of its own.
  leaf,

  /// `:name[label]{attrs}` inside a sentence.
  text,
}

/// A directive, on its way to the builder that knows what it means.
///
/// The library's part is small on purpose: it reads the shape and stops there,
/// with no opinion about what `youtube` or `callout` is — which is exactly what
/// lets a document carry one. What arrives here is a name, whatever was written
/// in `{…}`, and the pieces already drawn, so a builder composes widgets rather
/// than parsing Markdown a second time.
@immutable
class MawyDirective {
  /// Creates a directive for a builder.
  const MawyDirective({
    required this.name,
    required this.kind,
    required this.attributes,
    required this.label,
    required this.children,
    required this.range,
    required this.source,
  });

  /// The name the document wrote after the colons.
  final String name;

  /// Which of the three shapes it was written in.
  final MawyDirectiveKind kind;

  /// `{key=value}`, in the order they were written.
  ///
  /// `{#id}` arrives as `id` and `{.a .b}` as `class`; a name written on its own
  /// arrives with an empty string, which is how a flag is spelled. Every value
  /// is a [String], because that is all the document said — reading one as a
  /// number or as a boolean is the builder's to do, as is deciding what a
  /// missing one means.
  final Map<String, String> attributes;

  /// The `[label]`, drawn. `null` when the document wrote none.
  final InlineSpan? label;

  /// A container's blocks, drawn. `null` for the other two shapes.
  final List<Widget>? children;

  /// Where in the document it was written.
  final MdRange range;

  /// The characters the directive was written with, source and all.
  final String source;
}

/// A picture the document asked for.
///
/// What a builder is handed, so that adding something to it later is not a
/// change to every builder anybody has written.
class MawyImage {
  /// Creates a request.
  const MawyImage({required this.url, required this.alt, this.title});

  /// Where the picture is. Already checked against the scheme allowlist, so a
  /// `javascript:` never reaches here — and a `data:` image arrives whole.
  final String url;

  /// What the picture is, for a reader who is not seeing it. Empty where the
  /// author wrote `![](…)`, which in Markdown means decoration.
  final String alt;

  /// The `title`, if one was written.
  final String? title;
}

/// What draws a picture the document points at.
///
/// Unset — the default — the viewer draws it itself: over the network, or out
/// of the bytes of a `data:` URL. Given one, the application draws it instead,
/// which is the only way to put headers on the request, send it through a
/// client of its own, answer it out of a cache, or refuse it.
///
/// Which pictures an application is willing to fetch is not a viewer's
/// decision to make, the same way where a link opens is not — see `onLinkTap`.
/// A private document drawn in a public page is the case this exists for: the
/// URLs in it are somebody else's, and a viewer that fetched them all without
/// asking would be a viewer that told somebody else which documents are being
/// read.
typedef MawyImageBuilder = Widget Function(BuildContext context, MawyImage image);

/// Which of the two a URL was written as.
enum MawyUrlKind {
  /// A link's destination.
  link,

  /// A picture's source.
  image,
}

/// Where a relative URL points.
///
/// A URL written in a document is relative to the *document*. Whatever is
/// drawing it is somewhere else — so `![](./diagram.png)` in a file read off a
/// disk, or out of a repository, or from behind an API, is a picture with no
/// address anybody can follow. Only the application knows where the document
/// came from, so only the application can say what that address means.
///
/// ```dart
/// MawyViewer(
///   value: document,
///   resolveUrl: (String url, MawyUrlKind kind) => Uri.parse(base).resolve(url).toString(),
/// )
/// ```
///
/// Called for every relative URL in the document and for no other — see
/// `isRelativeUrl` for what that means and why an anchor, a scheme and a
/// protocol-relative address are all left alone. It reaches a link's
/// destination and a picture's source, so an application writes the answer
/// once.
///
/// **What it returns is used as written.** The scheme allowlist has already run
/// on what the *document* said by the time this is called, and what comes back
/// is not checked again — an application answering with an address only it can
/// serve is the case this is for, and a second check would make it impossible.
/// The document is untrusted here and the application is not, which is the same
/// line every other hook in this library draws.
typedef MawyUrlResolver = String Function(String url, MawyUrlKind kind);

/// What draws one directive.
///
/// A [MawyDirectiveKind.text] one is placed in the sentence as a
/// [WidgetSpan], so a builder for an inline directive should return something
/// that sits on a line of text — a [Text.rich] of its own is usually it.
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);

/// The language the viewer's own interface is written in.
///
/// Nothing to do with the language a document is written in.
enum MawyLocale {
  /// English.
  en,

  /// Korean.
  ko,
}
