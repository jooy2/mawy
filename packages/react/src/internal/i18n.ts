/**
 * The words the library says on its own behalf.
 *
 * Nothing here is about the document. These are the toolbar's labels, the
 * dropzone's invitation and the sentences a screen reader is given — the
 * library's own chrome, which is written in whatever language the application
 * around it is written in, and has nothing to do with what the author wrote.
 *
 * A flat record rather than a message format: every string is a whole sentence
 * or a whole label, none of them interpolate, and a formatting library for that
 * would be a dependency to save nothing.
 */

import type { MawyLocale } from '../types.js';

export interface MawyStrings {
  toolbar: string;
  fontFamily: string;
  fontFamilySans: string;
  fontFamilySerif: string;
  fontFamilyMono: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  measure: string;
  measureNarrow: string;
  measureNormal: string;
  measureWide: string;
  measureFull: string;
  colorScheme: string;
  colorSchemeLight: string;
  colorSchemeDark: string;
  colorSchemeSystem: string;
  outline: string;
  outlineEmpty: string;
  copy: string;
  copied: string;
  copyFailed: string;
  copyCode: string;
  open: string;
  close: string;
  document: string;
  emptyTitle: string;
  emptyHint: string;
  emptyAction: string;
  dropHere: string;
  readFailed: string;
  fileTooLarge: string;
  reset: string;
  footnotes: string;
  footnoteBack: string;
  alertNote: string;
  alertTip: string;
  alertImportant: string;
  alertWarning: string;
  alertCaution: string;
  editor: string;
  source: string;
  mode: string;
  modeWysiwyg: string;
  modePlain: string;
  modePreview: string;
  modeSplit: string;
  bold: string;
  italic: string;
  strikethrough: string;
  codeSpan: string;
  link: string;
  image: string;
  heading: string;
  heading1: string;
  heading2: string;
  heading3: string;
  paragraph: string;
  quote: string;
  bulletList: string;
  orderedList: string;
  taskList: string;
  codeBlock: string;
  thematicBreak: string;
  status: string;
  statusPosition: string;
  statusSelected: string;
  statusLines: string;
  statusWords: string;
  statusCharacters: string;
  editorPlaceholder: string;
  /**
   * How to get out, said to a screen reader beside the surface.
   *
   * `Tab` indents here, which makes this a keyboard trap unless somebody is
   * told the way out — and a rule nobody is told about is a rule that does not
   * exist for the person who needed it.
   */
  sourceEscape: string;
  find: string;
  replace: string;
  findMatchCase: string;
  findPrevious: string;
  findNext: string;
  findClose: string;
  /** `%N` of `%T`, which is the count and the one the caret is on. */
  findMatches: string;
  findNoMatches: string;
  replaceOne: string;
  replaceAll: string;
  dropImage: string;
  uploading: string;
  uploadFailed: string;
}

const en: MawyStrings = {
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
  copyFailed: 'Could not copy',
  copyCode: 'Copy this code',
  open: 'Open a file',
  close: 'Close',
  document: 'Document',
  emptyTitle: 'Open a Markdown file',
  emptyHint: 'Drop a .md file here, or choose one to read.',
  emptyAction: 'Choose a file',
  dropHere: 'Drop to open',
  readFailed: 'That file could not be read.',
  fileTooLarge: 'That file is too large to open here.',
  reset: 'Back to the defaults',
  footnotes: 'Footnotes',
  footnoteBack: 'Back to where this was mentioned',
  alertNote: 'Note',
  alertTip: 'Tip',
  alertImportant: 'Important',
  alertWarning: 'Warning',
  alertCaution: 'Caution',
  editor: 'Document',
  source: 'Markdown source',
  mode: 'View',
  modeWysiwyg: 'Formatted',
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
  sourceEscape: 'Tab indents. Press Escape and then Tab to move on.',
  find: 'Find',
  replace: 'Replace',
  findMatchCase: 'Match case',
  findPrevious: 'Previous match',
  findNext: 'Next match',
  findClose: 'Close find',
  findMatches: '%N of %T',
  findNoMatches: 'No matches',
  replaceOne: 'Replace',
  replaceAll: 'Replace all',
  dropImage: 'Drop to add',
  uploading: 'Adding the image…',
  uploadFailed: 'That image could not be added.'
};

const ko: MawyStrings = {
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
  copyFailed: '복사하지 못했습니다',
  copyCode: '이 코드 복사',
  open: '파일 열기',
  close: '닫기',
  document: '문서',
  emptyTitle: '마크다운 파일 열기',
  emptyHint: '여기에 .md 파일을 놓거나, 읽을 파일을 고르세요.',
  emptyAction: '파일 선택',
  dropHere: '놓으면 열립니다',
  readFailed: '파일을 읽지 못했습니다.',
  fileTooLarge: '여기서 열기에는 너무 큰 파일입니다.',
  reset: '기본값으로',
  footnotes: '각주',
  footnoteBack: '언급된 자리로 돌아가기',
  alertNote: '참고',
  alertTip: '도움말',
  alertImportant: '중요',
  alertWarning: '주의',
  alertCaution: '경고',
  editor: '문서',
  source: '마크다운 원문',
  mode: '보기',
  modeWysiwyg: '서식',
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
  sourceEscape: 'Tab은 들여쓰기입니다. 빠져나가려면 Escape를 누른 다음 Tab을 누르세요.',
  find: '찾기',
  replace: '바꾸기',
  findMatchCase: '대소문자 구분',
  findPrevious: '이전 결과',
  findNext: '다음 결과',
  findClose: '찾기 닫기',
  findMatches: '%T개 중 %N번째',
  findNoMatches: '결과 없음',
  replaceOne: '바꾸기',
  replaceAll: '모두 바꾸기',
  dropImage: '놓으면 넣습니다',
  uploading: '이미지를 넣는 중…',
  uploadFailed: '이미지를 넣지 못했습니다.'
};

const STRINGS: Record<MawyLocale, MawyStrings> = { en, ko };

/** The strings for a locale, falling back to English for anything unknown. */
export function stringsFor(locale: MawyLocale | undefined): MawyStrings {
  return STRINGS[locale as MawyLocale] ?? en;
}
