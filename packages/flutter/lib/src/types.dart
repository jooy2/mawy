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

/// What draws one directive.
///
/// A [MawyDirectiveKind.text] one is placed in the sentence as a
/// [WidgetSpan], so a builder for an inline directive should return something
/// that sits on a line of text — a [Text.rich] of its own is usually it.
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);

/// The language the viewer's own chrome is written in.
///
/// Nothing to do with the language a document is written in.
enum MawyLocale {
  /// English.
  en,

  /// Korean.
  ko,
}
