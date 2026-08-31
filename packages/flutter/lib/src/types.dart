/// The vocabulary every part of Mawy is written in.
///
/// These are the types more than one widget needs, which is why they sit here
/// rather than beside whichever widget introduced them — and they are the React
/// package's types under the same names, so an application that has read one
/// has read the other.
library;

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

/// The language the viewer's own chrome is written in.
///
/// Nothing to do with the language a document is written in.
enum MawyLocale {
  /// English.
  en,

  /// Korean.
  ko,
}
