/// The words the library says on its own behalf.
///
/// Nothing here is about the document. These are the toolbar's labels, the
/// outline's empty state and the sentences a screen reader is given — the
/// library's own chrome, which is written in whatever language the application
/// around it is written in, and has nothing to do with what the author wrote.
///
/// The same strings as the React package's `internal/i18n.ts`, under the same
/// names, minus the ones only an editor needs.
library;

import 'package:mawy/src/types.dart';

/// Every string the viewer draws.
class MawyStrings {
  /// Creates a set of strings.
  const MawyStrings({
    required this.toolbar,
    required this.fontFamily,
    required this.fontFamilySans,
    required this.fontFamilySerif,
    required this.fontFamilyMono,
    required this.fontSize,
    required this.lineHeight,
    required this.letterSpacing,
    required this.measure,
    required this.measureNarrow,
    required this.measureNormal,
    required this.measureWide,
    required this.measureFull,
    required this.colorScheme,
    required this.colorSchemeLight,
    required this.colorSchemeDark,
    required this.colorSchemeSystem,
    required this.outline,
    required this.outlineEmpty,
    required this.copy,
    required this.copied,
    required this.copyCode,
    required this.close,
    required this.document,
    required this.reset,
    required this.footnotes,
    required this.footnoteBack,
    required this.alertNote,
    required this.alertTip,
    required this.alertImportant,
    required this.alertWarning,
    required this.alertCaution,
  });

  /// The toolbar's own name.
  final String toolbar;

  /// The typeface menu.
  final String fontFamily;

  /// The sans-serif role.
  final String fontFamilySans;

  /// The serif role.
  final String fontFamilySerif;

  /// The monospace role.
  final String fontFamilyMono;

  /// The text-size control.
  final String fontSize;

  /// The line-height control.
  final String lineHeight;

  /// The letter-spacing control.
  final String letterSpacing;

  /// The column-width control.
  final String measure;

  /// The narrow column.
  final String measureNarrow;

  /// The default column.
  final String measureNormal;

  /// The wide column.
  final String measureWide;

  /// No column at all.
  final String measureFull;

  /// The theme control.
  final String colorScheme;

  /// The light theme.
  final String colorSchemeLight;

  /// The dark theme.
  final String colorSchemeDark;

  /// Whatever the platform says.
  final String colorSchemeSystem;

  /// The outline panel.
  final String outline;

  /// What the outline says about a document with no headings.
  final String outlineEmpty;

  /// The copy button.
  final String copy;

  /// What it says once it has.
  final String copied;

  /// A code block's own copy button.
  final String copyCode;

  /// Closing a panel.
  final String close;

  /// What the document is called to a screen reader.
  final String document;

  /// Putting the typography back where it started.
  final String reset;

  /// The heading over the notes at the bottom.
  final String footnotes;

  /// The link from a note back to the sentence that mentioned it.
  final String footnoteBack;

  /// `> [!NOTE]`.
  final String alertNote;

  /// `> [!TIP]`.
  final String alertTip;

  /// `> [!IMPORTANT]`.
  final String alertImportant;

  /// `> [!WARNING]`.
  final String alertWarning;

  /// `> [!CAUTION]`.
  final String alertCaution;
}

const MawyStrings _en = MawyStrings(
  toolbar: 'Document settings',
  fontFamily: 'Typeface',
  fontFamilySans: 'Sans serif',
  fontFamilySerif: 'Serif',
  fontFamilyMono: 'Monospace',
  fontSize: 'Text size',
  lineHeight: 'Line height',
  letterSpacing: 'Letter spacing',
  measure: 'Content width',
  measureNarrow: 'Narrow',
  measureNormal: 'Normal',
  measureWide: 'Wide',
  measureFull: 'Full width',
  colorScheme: 'Theme',
  colorSchemeLight: 'Light',
  colorSchemeDark: 'Dark',
  colorSchemeSystem: 'Match the system',
  outline: 'Outline',
  outlineEmpty: 'This document has no headings.',
  copy: 'Copy the Markdown',
  copied: 'Copied',
  copyCode: 'Copy this code',
  close: 'Close',
  document: 'Document',
  reset: 'Back to the defaults',
  footnotes: 'Footnotes',
  footnoteBack: 'Back to where this was mentioned',
  alertNote: 'Note',
  alertTip: 'Tip',
  alertImportant: 'Important',
  alertWarning: 'Warning',
  alertCaution: 'Caution',
);

const MawyStrings _ko = MawyStrings(
  toolbar: '문서 설정',
  fontFamily: '글꼴',
  fontFamilySans: '고딕',
  fontFamilySerif: '명조',
  fontFamilyMono: '고정폭',
  fontSize: '글자 크기',
  lineHeight: '줄 간격',
  letterSpacing: '자간',
  measure: '본문 폭',
  measureNarrow: '좁게',
  measureNormal: '보통',
  measureWide: '넓게',
  measureFull: '전체 폭',
  colorScheme: '테마',
  colorSchemeLight: '라이트',
  colorSchemeDark: '다크',
  colorSchemeSystem: '시스템 설정 따르기',
  outline: '목차',
  outlineEmpty: '제목이 없는 문서입니다.',
  copy: '마크다운 원문 복사',
  copied: '복사했습니다',
  copyCode: '이 코드 복사',
  close: '닫기',
  document: '문서',
  reset: '기본값으로',
  footnotes: '각주',
  footnoteBack: '언급된 자리로 돌아가기',
  alertNote: '참고',
  alertTip: '도움말',
  alertImportant: '중요',
  alertWarning: '주의',
  alertCaution: '경고',
);

/// The strings for a locale.
MawyStrings stringsFor(MawyLocale locale) => locale == MawyLocale.ko ? _ko : _en;
