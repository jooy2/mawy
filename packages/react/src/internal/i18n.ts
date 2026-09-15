/**
 * The words the library says on its own behalf.
 *
 * Nothing here is about the document. These are the toolbar's labels, the
 * dropzone's invitation and the sentences a screen reader is given — the
 * library's own interface, which is written in whatever language the
 * application around it is written in, and has nothing to do with what the
 * author wrote.
 *
 * A flat record rather than a message format: every string is a whole sentence
 * or a whole label, and the few that carry a number or a name mark where it goes
 * with `%` and one capital letter — see `fill`. A formatting library for that
 * would be a dependency to save nothing.
 */

import type { MawyLocale, MawyStrings } from '../types.js';

export type { MawyStrings };

const en: MawyStrings = {
  lang: 'en',
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
  outline: 'Contents',
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
  emptyNothing: 'Nothing to show yet.',
  dropHere: 'Drop to open',
  readFailed: 'That file could not be read.',
  fileTooLarge: 'That file is too large to open here.',
  reset: 'Back to the defaults',
  footnotes: 'Footnotes',
  footnoteBack: 'Back to where this was mentioned',
  task: 'Task',
  alertNote: 'Note',
  alertTip: 'Tip',
  alertImportant: 'Important',
  alertWarning: 'Warning',
  alertCaution: 'Caution',
  editor: 'Document',
  undo: 'Undo',
  redo: 'Redo',
  more: 'More controls',
  divider: 'Resize the panes',
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
  imageUpload: 'Upload an image',
  imageLink: 'Link to an image',
  heading: 'Heading',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  heading4: 'Heading 4',
  heading5: 'Heading 5',
  heading6: 'Heading 6',
  paragraph: 'Body text',
  quote: 'Quotation',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  taskList: 'Task list',
  codeBlock: 'Code block',
  table: 'Table',
  tableInsert: 'Insert a table',
  tableSize: '%C × %R',
  tableInsertSized: 'Insert a table %C columns wide and %R rows tall',
  tableRowBelow: 'Add a row below',
  tableRowAbove: 'Add a row above',
  tableColumnAfter: 'Add a column after',
  tableColumnBefore: 'Add a column before',
  tableRowRemove: 'Delete this row',
  tableColumnRemove: 'Delete this column',
  tableRowsAbove: 'Add %N rows above',
  tableRowsBelow: 'Add %N rows below',
  tableColumnsBefore: 'Add %N columns before',
  tableColumnsAfter: 'Add %N columns after',
  tableRowsRemove: 'Delete these %N rows',
  tableColumnsRemove: 'Delete these %N columns',
  tableCellsClear: 'Clear the selected cells',
  tableAlignLeft: 'Align left',
  tableAlignCenter: 'Align center',
  tableAlignRight: 'Align right',
  tableRemove: 'Delete the table',
  codeLanguage: 'Language',
  codeLanguageNone: 'Plain text',
  codeBlockRemove: 'Delete the code block',
  alert: 'Alert',
  alertRemove: 'Delete the alert',
  thematicBreak: 'Divider',
  status: 'Document statistics',
  statusPosition: 'Ln %L, Col %C',
  statusSelected: '%N selected',
  statusLines: 'lines',
  statusWords: 'words',
  statusCharacters: 'characters',
  editorPlaceholder: 'Write here…',
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
  openFile: 'Open a file',
  saveFile: 'Save',
  saved: 'Saved as %N',
  dropImage: 'Drop here to attach an image',
  dropNotDocument: 'A dropped file does not replace the document — use Open for that.',
  uploading: 'Adding the image…',
  uploadFailed: 'That image could not be added.',
  uploadFailedSome: '%N of %T images could not be added.'
};

const ko: MawyStrings = {
  lang: 'ko',
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
  emptyNothing: '아직 보여줄 내용이 없습니다.',
  dropHere: '놓으면 열립니다',
  readFailed: '파일을 읽지 못했습니다.',
  fileTooLarge: '여기서 열기에는 너무 큰 파일입니다.',
  reset: '기본값으로',
  footnotes: '각주',
  footnoteBack: '언급된 자리로 돌아가기',
  task: '할 일',
  alertNote: '참고',
  alertTip: '도움말',
  alertImportant: '중요',
  alertWarning: '주의',
  alertCaution: '경고',
  editor: '문서',
  undo: '실행 취소',
  redo: '다시 실행',
  more: '더 보기',
  divider: '창 크기 조절',
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
  imageUpload: '이미지 올리기',
  imageLink: '이미지 링크 넣기',
  heading: '제목',
  heading1: '제목 1',
  heading2: '제목 2',
  heading3: '제목 3',
  heading4: '제목 4',
  heading5: '제목 5',
  heading6: '제목 6',
  paragraph: '본문',
  quote: '인용',
  bulletList: '순서 없는 목록',
  orderedList: '순서 있는 목록',
  taskList: '체크 목록',
  codeBlock: '코드 블록',
  table: '표',
  tableInsert: '표 넣기',
  tableSize: '%C × %R',
  tableInsertSized: '%C열 %R행 표 넣기',
  tableRowBelow: '아래에 행 추가',
  tableRowAbove: '위에 행 추가',
  tableColumnAfter: '뒤에 열 추가',
  tableColumnBefore: '앞에 열 추가',
  tableRowRemove: '이 행 삭제',
  tableColumnRemove: '이 열 삭제',
  tableRowsAbove: '위에 행 %N개 추가',
  tableRowsBelow: '아래에 행 %N개 추가',
  tableColumnsBefore: '앞에 열 %N개 추가',
  tableColumnsAfter: '뒤에 열 %N개 추가',
  tableRowsRemove: '이 행 %N개 삭제',
  tableColumnsRemove: '이 열 %N개 삭제',
  tableCellsClear: '선택한 셀 비우기',
  tableAlignLeft: '왼쪽 정렬',
  tableAlignCenter: '가운데 정렬',
  tableAlignRight: '오른쪽 정렬',
  tableRemove: '표 삭제',
  codeLanguage: '언어',
  codeLanguageNone: '일반 텍스트',
  codeBlockRemove: '코드 블록 삭제',
  alert: '알림 블록',
  alertRemove: '알림 블록 삭제',
  thematicBreak: '구분선',
  status: '문서 통계',
  statusPosition: '%L행 %C열',
  statusSelected: '%N자 선택',
  statusLines: '줄',
  statusWords: '단어',
  statusCharacters: '자',
  editorPlaceholder: '여기에 입력…',
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
  openFile: '파일 열기',
  saveFile: '저장',
  saved: '%N(으)로 저장했습니다',
  dropImage: '여기에 드롭하여 이미지 첨부',
  dropNotDocument: '파일을 놓아도 문서가 바뀌지는 않습니다. 문서를 바꾸려면 열기를 쓰세요.',
  uploading: '이미지를 넣는 중…',
  uploadFailed: '이미지를 넣지 못했습니다.',
  uploadFailedSome: '이미지 %T개 중 %N개를 넣지 못했습니다.'
};

const STRINGS: Record<MawyLocale, MawyStrings> = { en, ko };

/** The strings for a locale, falling back to English for anything unknown. */
export function stringsFor(locale: MawyLocale | undefined): MawyStrings {
  return STRINGS[locale as MawyLocale] ?? en;
}

/**
 * The strings for a locale with an application's own words over them.
 *
 * Only the keys the application gave are replaced, so a catalogue that has
 * translated half of them still gets a whole interface — the other half in the
 * locale's words, and `lang` with them unless it was given too.
 */
export function withStrings(
  locale: MawyLocale | undefined,
  overrides: Partial<MawyStrings> | undefined
): MawyStrings {
  if (!overrides) {
    return stringsFor(locale);
  }

  // A key given as `undefined` is a key not given, which is what it is once
  // `useStrings` has compared it on a page — and a server has to agree.
  const given = Object.entries(overrides).filter(([, text]) => text !== undefined);

  return { ...stringsFor(locale), ...Object.fromEntries(given) };
}

/**
 * A string with its placeholders filled in: `%N` for `N`, and so on.
 *
 * One pass over the template, so every place a placeholder is written is filled
 * and nothing that was put in is read again — a file called `%T.md` is saved as
 * `%T.md`. A placeholder the string does not name is left as it was written.
 */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/%([A-Z])/g, (whole, letter: string) => values[letter] ?? whole);
}
