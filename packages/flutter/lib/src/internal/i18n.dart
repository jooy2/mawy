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
    required this.editor,
    required this.source,
    required this.mode,
    required this.modePlain,
    required this.modePreview,
    required this.modeSplit,
    required this.bold,
    required this.italic,
    required this.strikethrough,
    required this.codeSpan,
    required this.link,
    required this.image,
    required this.heading,
    required this.heading1,
    required this.heading2,
    required this.heading3,
    required this.paragraph,
    required this.quote,
    required this.bulletList,
    required this.orderedList,
    required this.taskList,
    required this.codeBlock,
    required this.thematicBreak,
    required this.status,
    required this.statusPosition,
    required this.statusSelected,
    required this.statusLines,
    required this.statusWords,
    required this.statusCharacters,
    required this.editorPlaceholder,
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

  /// The editor: Document.
  final String editor;

  /// The editor: Markdown source.
  final String source;

  /// The editor: View.
  final String mode;

  /// The editor: Source.
  final String modePlain;

  /// The editor: Preview.
  final String modePreview;

  /// The editor: Side by side.
  final String modeSplit;

  /// The editor: Bold.
  final String bold;

  /// The editor: Italic.
  final String italic;

  /// The editor: Strikethrough.
  final String strikethrough;

  /// The editor: Code.
  final String codeSpan;

  /// The editor: Link.
  final String link;

  /// The editor: Image.
  final String image;

  /// The editor: Heading.
  final String heading;

  /// The editor: Heading 1.
  final String heading1;

  /// The editor: Heading 2.
  final String heading2;

  /// The editor: Heading 3.
  final String heading3;

  /// The editor: Body text.
  final String paragraph;

  /// The editor: Quotation.
  final String quote;

  /// The editor: Bulleted list.
  final String bulletList;

  /// The editor: Numbered list.
  final String orderedList;

  /// The editor: Task list.
  final String taskList;

  /// The editor: Code block.
  final String codeBlock;

  /// The editor: Divider.
  final String thematicBreak;

  /// The editor: Document statistics.
  final String status;

  /// The editor: Ln %L, Col %C.
  final String statusPosition;

  /// The editor: %N selected.
  final String statusSelected;

  /// The editor: lines.
  final String statusLines;

  /// The editor: words.
  final String statusWords;

  /// The editor: characters.
  final String statusCharacters;

  /// The editor: Write in Markdown….
  final String editorPlaceholder;

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
  editor: 'Document',
  source: 'Markdown source',
  mode: 'View',
  modePlain: 'Source',
  modePreview: 'Preview',
  modeSplit: 'Side by side',
  bold: 'Bold',
  italic: 'Italic',
  strikethrough: 'Strikethrough',
  codeSpan: 'Code',
  link: 'Link',
  image: 'Image',
  heading: 'Heading',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  paragraph: 'Body text',
  quote: 'Quotation',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  taskList: 'Task list',
  codeBlock: 'Code block',
  thematicBreak: 'Divider',
  status: 'Document statistics',
  statusPosition: 'Ln %L, Col %C',
  statusSelected: '%N selected',
  statusLines: 'lines',
  statusWords: 'words',
  statusCharacters: 'characters',
  editorPlaceholder: 'Write in Markdown…',
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
  editor: '문서',
  source: '마크다운 원문',
  mode: '보기',
  modePlain: '원문',
  modePreview: '미리보기',
  modeSplit: '나란히',
  bold: '굵게',
  italic: '기울임',
  strikethrough: '취소선',
  codeSpan: '코드',
  link: '링크',
  image: '이미지',
  heading: '제목',
  heading1: '제목 1',
  heading2: '제목 2',
  heading3: '제목 3',
  paragraph: '본문',
  quote: '인용',
  bulletList: '순서 없는 목록',
  orderedList: '순서 있는 목록',
  taskList: '체크 목록',
  codeBlock: '코드 블록',
  thematicBreak: '구분선',
  status: '문서 통계',
  statusPosition: '%L행 %C열',
  statusSelected: '%N자 선택',
  statusLines: '줄',
  statusWords: '단어',
  statusCharacters: '자',
  editorPlaceholder: '마크다운으로 쓰세요…',
  alertNote: '참고',
  alertTip: '도움말',
  alertImportant: '중요',
  alertWarning: '주의',
  alertCaution: '경고',
);

/// The strings for a locale.
MawyStrings stringsFor(MawyLocale locale) => locale == MawyLocale.ko ? _ko : _en;
