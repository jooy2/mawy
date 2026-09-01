/// The colours Mawy draws with.
///
/// These are the custom properties at the top of the React package's
/// `styles.css`, value for value. The two packages are one design language, and
/// a colour that is `#5b34ea` in a browser is `#5b34ea` in an app — so the
/// palette is copied rather than re-chosen, and a change to either is a change
/// anyone can find in the other.
///
/// Nothing here is consulted through a global. A [MawyTokens] is chosen from
/// the brightness the viewer was told to draw at and handed down that viewer's
/// own tree, which is what lets one document be dark inside a light screen.
///
/// It is exported for the application drawing its own chrome beside a document
/// and wanting the same colours in it. There is no way to hand a viewer a
/// palette of your own yet — the React package's `--mawy-*` custom properties
/// have no counterpart here.
library;

import 'package:flutter/widgets.dart';

/// One palette: every colour a document and its chrome are drawn in.
@immutable
class MawyTokens {
  /// Creates a palette. Both [light] and [dark] are built for you.
  const MawyTokens({
    required this.brightness,
    required this.background,
    required this.backgroundSunken,
    required this.backgroundRaised,
    required this.chrome,
    required this.foreground,
    required this.foregroundMuted,
    required this.foregroundSubtle,
    required this.border,
    required this.borderStrong,
    required this.accent,
    required this.accentHover,
    required this.accentForeground,
    required this.accentSoft,
    required this.codeBackground,
    required this.codeForeground,
    required this.markBackground,
    required this.markForeground,
    required this.highlightComment,
    required this.highlightString,
    required this.highlightNumber,
    required this.highlightKeyword,
    required this.highlightType,
    required this.highlightFunction,
    required this.highlightVariable,
    required this.highlightPunctuation,
    required this.note,
    required this.tip,
    required this.important,
    required this.warning,
    required this.caution,
  });

  /// Whether this is the light palette or the dark one.
  final Brightness brightness;

  /// The page behind the document.
  final Color background;

  /// A surface set into the page — a table's header, a quotation.
  final Color backgroundSunken;

  /// A surface lifted off it — a menu.
  final Color backgroundRaised;

  /// The toolbar's own ground.
  final Color chrome;

  /// Body text.
  final Color foreground;

  /// Text that is not the point of the sentence.
  final Color foregroundMuted;

  /// Text that is barely there.
  final Color foregroundSubtle;

  /// `// a comment`, in a code block. Drawn in italics.
  final Color highlightComment;

  /// A string, and a regular expression with it.
  final Color highlightString;

  /// A number, and a constant with it.
  final Color highlightNumber;

  /// A keyword.
  final Color highlightKeyword;

  /// A type name.
  final Color highlightType;

  /// A name being called, and a tag with it.
  final Color highlightFunction;

  /// A variable, and an attribute name with it.
  final Color highlightVariable;

  /// An operator, and punctuation with it.
  final Color highlightPunctuation;

  /// A hairline.
  final Color border;

  /// A line that has to be seen.
  final Color borderStrong;

  /// Links, and anything the reader can act on.
  final Color accent;

  /// The same under a pointer.
  final Color accentHover;

  /// What is legible on top of [accent].
  final Color accentForeground;

  /// [accent] at the strength a background can carry.
  final Color accentSoft;

  /// Behind a code span or a code block.
  final Color codeBackground;

  /// The code itself.
  final Color codeForeground;

  /// Behind highlighted text.
  final Color markBackground;

  /// Highlighted text.
  final Color markForeground;

  /// `> [!NOTE]`.
  final Color note;

  /// `> [!TIP]`.
  final Color tip;

  /// `> [!IMPORTANT]`.
  final Color important;

  /// `> [!WARNING]`.
  final Color warning;

  /// `> [!CAUTION]`.
  final Color caution;

  /// The palette a light screen gets.
  static const MawyTokens light = MawyTokens(
    brightness: Brightness.light,
    background: Color(0xFFFFFFFF),
    backgroundSunken: Color(0xFFF6F6F8),
    backgroundRaised: Color(0xFFFFFFFF),
    chrome: Color(0xD1FFFFFF),
    foreground: Color(0xFF16161A),
    foregroundMuted: Color(0xFF5B5B66),
    foregroundSubtle: Color(0xFF70707B),
    border: Color(0xFFE5E5EA),
    borderStrong: Color(0xFFD0D0D8),
    accent: Color(0xFF5B34EA),
    accentHover: Color(0xFF4A29E0),
    accentForeground: Color(0xFFFFFFFF),
    accentSoft: Color(0x1A5B34EA),
    codeBackground: Color(0xFFF3F3F6),
    codeForeground: Color(0xFF24242C),
    markBackground: Color(0xFFFFF3A8),
    markForeground: Color(0xFF4A3B00),
    highlightComment: Color(0xFF7B7B88),
    highlightString: Color(0xFF0F7A4A),
    highlightNumber: Color(0xFFA8541B),
    highlightKeyword: Color(0xFF8A37C4),
    highlightType: Color(0xFF9A6407),
    highlightFunction: Color(0xFF2159BD),
    highlightVariable: Color(0xFFB03A5B),
    highlightPunctuation: Color(0xFF7B7B88),
    note: Color(0xFF2563C9),
    tip: Color(0xFF17855A),
    important: Color(0xFF7C3AED),
    warning: Color(0xFFB3760A),
    caution: Color(0xFFCF3232),
  );

  /// The palette a dark screen gets.
  static const MawyTokens dark = MawyTokens(
    brightness: Brightness.dark,
    background: Color(0xFF17171B),
    backgroundSunken: Color(0xFF101014),
    backgroundRaised: Color(0xFF1E1E24),
    chrome: Color(0xD617171B),
    foreground: Color(0xFFE9E9EF),
    foregroundMuted: Color(0xFFA2A2AF),
    foregroundSubtle: Color(0xFF87879A),
    border: Color(0xFF2B2B33),
    borderStrong: Color(0xFF3D3D47),
    accent: Color(0xFF9D86FF),
    accentHover: Color(0xFFAD9AFF),
    accentForeground: Color(0xFF14101F),
    accentSoft: Color(0x299D86FF),
    codeBackground: Color(0xFF22222A),
    codeForeground: Color(0xFFDCDCE6),
    markBackground: Color(0xFF4A3D00),
    markForeground: Color(0xFFFFE98A),
    highlightComment: Color(0xFF8B8B9C),
    highlightString: Color(0xFF7DDBA4),
    highlightNumber: Color(0xFFF0A26B),
    highlightKeyword: Color(0xFFD5A3FF),
    highlightType: Color(0xFFF0D08A),
    highlightFunction: Color(0xFF7FB6FF),
    highlightVariable: Color(0xFFFF9AB0),
    highlightPunctuation: Color(0xFF8B8B9C),
    note: Color(0xFF6EA8FE),
    tip: Color(0xFF4ADE9D),
    important: Color(0xFFB79BFF),
    warning: Color(0xFFE2B14A),
    caution: Color(0xFFFF7B72),
  );

  /// The palette for a brightness.
  static MawyTokens of(Brightness brightness) => brightness == Brightness.dark ? dark : light;

  @override
  bool operator ==(Object other) =>
      other is MawyTokens &&
      other.brightness == brightness &&
      other.background == background &&
      other.foreground == foreground &&
      other.accent == accent &&
      other.border == border &&
      other.codeBackground == codeBackground;

  @override
  int get hashCode =>
      Object.hash(brightness, background, foreground, accent, border, codeBackground);
}

/// The corner radii, which are three sizes and not a scale.
abstract final class MawyRadius {
  /// A code span, a chip.
  static const double small = 6;

  /// A button, a field.
  static const double medium = 9;

  /// A card, a menu, a code block.
  static const double large = 14;
}

/// How long anything takes to move, and how it moves.
abstract final class MawyMotion {
  /// The one duration.
  static const Duration duration = Duration(milliseconds: 140);

  /// The one curve.
  static const Cubic easing = Cubic(0.2, 0, 0.2, 1);
}
