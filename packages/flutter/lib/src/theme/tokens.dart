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
/// It is exported for the two applications that want it: the one drawing its
/// own chrome beside a document and wanting the same colours in it, and the one
/// wanting different colours in the document. [MawyTokensBuilder] is the second
/// of those — the React package's `--mawy-*` custom properties said in Dart,
/// and a function rather than a palette because a viewer settles on its
/// brightness after it has been handed everything else.
library;

import 'package:flutter/widgets.dart';

/// A palette per brightness, for an application that wants its own.
///
/// Called with the brightness the viewer settled on — from `colorScheme`, or
/// from the platform where that is `system` — and every time it settles on a
/// different one, so a document that follows the platform follows it in both
/// palettes rather than only in the one it opened on.
///
/// Start from one of the two rather than from nothing:
///
/// ```dart
/// MawyViewer(
///   value: document,
///   tokens: (Brightness brightness) =>
///       MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
/// );
/// ```
typedef MawyTokensBuilder = MawyTokens Function(Brightness brightness);

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
    required this.find,
    required this.findCurrent,
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

  /// Behind every match the find bar found.
  ///
  /// Translucent rather than opaque, so a match landing inside a coloured run
  /// of the source keeps that run's colour and gains a background.
  final Color find;

  /// Behind the one match being stepped through, and stronger than [find].
  final Color findCurrent;

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
    find: Color(0x73FFD60A),
    findCurrent: Color(0xB8FF9500),
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
    find: Color(0x42FFD60A),
    findCurrent: Color(0x7AFF9500),
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

  /// The same palette with whatever is named here changed.
  ///
  /// This is how a palette of your own is made: one of the two, and the
  /// colours that differ. Thirty-one arguments to change one of them is not
  /// a palette anybody would write twice.
  MawyTokens copyWith({
    Brightness? brightness,
    Color? background,
    Color? backgroundSunken,
    Color? backgroundRaised,
    Color? chrome,
    Color? foreground,
    Color? foregroundMuted,
    Color? foregroundSubtle,
    Color? border,
    Color? borderStrong,
    Color? accent,
    Color? accentHover,
    Color? accentForeground,
    Color? accentSoft,
    Color? find,
    Color? findCurrent,
    Color? codeBackground,
    Color? codeForeground,
    Color? markBackground,
    Color? markForeground,
    Color? highlightComment,
    Color? highlightString,
    Color? highlightNumber,
    Color? highlightKeyword,
    Color? highlightType,
    Color? highlightFunction,
    Color? highlightVariable,
    Color? highlightPunctuation,
    Color? note,
    Color? tip,
    Color? important,
    Color? warning,
    Color? caution,
  }) {
    return MawyTokens(
      brightness: brightness ?? this.brightness,
      background: background ?? this.background,
      backgroundSunken: backgroundSunken ?? this.backgroundSunken,
      backgroundRaised: backgroundRaised ?? this.backgroundRaised,
      chrome: chrome ?? this.chrome,
      foreground: foreground ?? this.foreground,
      foregroundMuted: foregroundMuted ?? this.foregroundMuted,
      foregroundSubtle: foregroundSubtle ?? this.foregroundSubtle,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      accent: accent ?? this.accent,
      accentHover: accentHover ?? this.accentHover,
      accentForeground: accentForeground ?? this.accentForeground,
      accentSoft: accentSoft ?? this.accentSoft,
      find: find ?? this.find,
      findCurrent: findCurrent ?? this.findCurrent,
      codeBackground: codeBackground ?? this.codeBackground,
      codeForeground: codeForeground ?? this.codeForeground,
      markBackground: markBackground ?? this.markBackground,
      markForeground: markForeground ?? this.markForeground,
      highlightComment: highlightComment ?? this.highlightComment,
      highlightString: highlightString ?? this.highlightString,
      highlightNumber: highlightNumber ?? this.highlightNumber,
      highlightKeyword: highlightKeyword ?? this.highlightKeyword,
      highlightType: highlightType ?? this.highlightType,
      highlightFunction: highlightFunction ?? this.highlightFunction,
      highlightVariable: highlightVariable ?? this.highlightVariable,
      highlightPunctuation: highlightPunctuation ?? this.highlightPunctuation,
      note: note ?? this.note,
      tip: tip ?? this.tip,
      important: important ?? this.important,
      warning: warning ?? this.warning,
      caution: caution ?? this.caution,
    );
  }

  /// Every colour, and not a sample of them.
  ///
  /// Six fields would do for the two palettes this package ships, and would
  /// quietly call two different palettes the same one the moment an
  /// application built its own.
  @override
  bool operator ==(Object other) =>
      other is MawyTokens &&
      other.brightness == brightness &&
      other.background == background &&
      other.backgroundSunken == backgroundSunken &&
      other.backgroundRaised == backgroundRaised &&
      other.chrome == chrome &&
      other.foreground == foreground &&
      other.foregroundMuted == foregroundMuted &&
      other.foregroundSubtle == foregroundSubtle &&
      other.border == border &&
      other.borderStrong == borderStrong &&
      other.accent == accent &&
      other.accentHover == accentHover &&
      other.accentForeground == accentForeground &&
      other.accentSoft == accentSoft &&
      other.find == find &&
      other.findCurrent == findCurrent &&
      other.codeBackground == codeBackground &&
      other.codeForeground == codeForeground &&
      other.markBackground == markBackground &&
      other.markForeground == markForeground &&
      other.highlightComment == highlightComment &&
      other.highlightString == highlightString &&
      other.highlightNumber == highlightNumber &&
      other.highlightKeyword == highlightKeyword &&
      other.highlightType == highlightType &&
      other.highlightFunction == highlightFunction &&
      other.highlightVariable == highlightVariable &&
      other.highlightPunctuation == highlightPunctuation &&
      other.note == note &&
      other.tip == tip &&
      other.important == important &&
      other.warning == warning &&
      other.caution == caution;

  @override
  int get hashCode => Object.hashAll(<Object>[
    brightness,
    background,
    backgroundSunken,
    backgroundRaised,
    chrome,
    foreground,
    foregroundMuted,
    foregroundSubtle,
    border,
    borderStrong,
    accent,
    accentHover,
    accentForeground,
    accentSoft,
    find,
    findCurrent,
    codeBackground,
    codeForeground,
    markBackground,
    markForeground,
    highlightComment,
    highlightString,
    highlightNumber,
    highlightKeyword,
    highlightType,
    highlightFunction,
    highlightVariable,
    highlightPunctuation,
    note,
    tip,
    important,
    warning,
    caution,
  ]);
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

  /// How long, where the reader has asked the platform for less movement.
  ///
  /// [Duration.zero] rather than something shorter: a reader who turned this on
  /// did not ask for a quicker animation, they asked for the thing to be in its
  /// new state. It is the stylesheet's `@media (prefers-reduced-motion: reduce)`
  /// said in Dart, and it reads the same setting — the platform's, through
  /// [MediaQuery], rather than anything this package asks for on its own.
  static Duration durationOf(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context) ? Duration.zero : duration;
}
