/// The style body text is drawn in, which everything else is relative to.
///
/// Both widgets that draw a document build one, and it is the stylesheet's
/// `.mawy-md` rule said in Dart: the size, the line height and the letter
/// spacing the typography asks for, in the colour the palette says. Two copies
/// of it would be two documents set differently in the same application.
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';

/// The body style for [tokens] and [type].
///
/// The fallbacks are the ones the stylesheet names, minus what a platform
/// already has: a family is asked for by name only where the application named
/// one, and otherwise the role decides which list is tried.
TextStyle mawyBodyStyle(MawyTokens tokens, MawyTypography type) => TextStyle(
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
