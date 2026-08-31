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
  alertNote: string;
  alertTip: string;
  alertImportant: string;
  alertWarning: string;
  alertCaution: string;
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
  alertNote: 'Note',
  alertTip: 'Tip',
  alertImportant: 'Important',
  alertWarning: 'Warning',
  alertCaution: 'Caution'
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
  alertNote: '참고',
  alertTip: '도움말',
  alertImportant: '중요',
  alertWarning: '주의',
  alertCaution: '경고'
};

const STRINGS: Record<MawyLocale, MawyStrings> = { en, ko };

/** The strings for a locale, falling back to English for anything unknown. */
export function stringsFor(locale: MawyLocale | undefined): MawyStrings {
  return STRINGS[locale as MawyLocale] ?? en;
}
