---
title: MDXEditor에서
order: 2
---

# MDXEditor에서 옮겨오기

MDXEditor의 플러그인과 프롭이 Mawy에서 무엇이 되는지, 그리고 옮기지 않는 편이 나은 경우는 언제인지 적었습니다.

`@mdxeditor/editor` 4를 보고 썼습니다. MDXEditor도 React 컴포넌트라 겉보기보다 옮길 것이 적습니다. 다만 안쪽은 반대로 서 있습니다. MDXEditor는 [Lexical](https://lexical.dev) 에디터 상태를 들고 `mdast-util-to-markdown`으로 마크다운을 써내고, Mawy는 마크다운 문자열을 편집해서 그립니다.

**문서가 MDX라면 MDXEditor에 남으세요.** 문서 안의 JSX는 그 에디터가 하는 일이고, 여기에는 문서 안의 컴포넌트를 읽거나 그리는 것이 없습니다. 아래는 순수한 마크다운을 편집하는 데 그 에디터를 쓰던 애플리케이션을 위한 내용입니다.

::: fw flutter

MDXEditor는 React 컴포넌트라 Flutter 애플리케이션 안에서 옮겨올 것은 없습니다. 넘어오는 것은 문서입니다. 파서가 두 패키지에서 같으므로 MDXEditor에서 쓴 순수한 마크다운 파일은 웹에서 읽히던 대로 여기서도 읽힙니다. MDX 자체는 어느 패키지에서도 읽지 않습니다.

:::

## 컴포넌트

```tsx
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

<MDXEditor
  markdown={document}
  onChange={save}
  plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin()]}
/>;
```

이것이

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue={document} onChange={save} />;
```

이렇게 됩니다. 플러그인 목록이 없는 이유는 문법이 선택 사항이 아니기 때문입니다. 파서는 CommonMark와 GitHub의 확장을 읽고, 화면은 읽어낸 것을 그립니다. 제목이 제목이 되려고 켜야 할 것은 없습니다.

**여기서 `value`는 진짜 제어 프롭입니다.** MDXEditor는 `markdown`을 마운트 시점에 한 번 읽고, 그 뒤에 문서를 바꾸려면 ref로 `setMarkdown`을 불러야 합니다. 그렇게 짜여 있다면 `value`를 넘기고 ref를 지우세요.

## 플러그인

| MDXEditor | Mawy |
| --- | --- |
| `headingsPlugin`, `listsPlugin`, `quotePlugin`, `thematicBreakPlugin`, `linkPlugin`, `tablePlugin`, `codeBlockPlugin` | — 파서가 전부 읽습니다 |
| `markdownShortcutPlugin` | — 그려진 문서에서 `# `를 치면 제목이 되는 것은 파서가 그렇게 읽기 때문입니다. [입력 규칙](../guide/editor#입력-규칙) |
| `toolbarPlugin` | 이름 목록인 [`toolbar`](../api/types/editor-toolbar-item) |
| `diffSourcePlugin` | `modes`와 `mode`. `'rich-text'`가 `wysiwyg`, `'source'`가 `plain`입니다. diff 화면은 여기 없습니다 |
| `linkDialogPlugin` | — [링크 옆의 바](../guide/editor#문서-편집-화면)가 그 일을 합니다 |
| `imagePlugin` | 파일은 [`onUploadImage`](../api/components/mawy-editor#이미지), 주소와 설명은 그림 옆의 바 |
| `codeMirrorPlugin` | 블록의 색은 [`highlight`](../api/functions/mawy-highlighter), 언어는 블록 위의 바에서 고릅니다 |
| `frontmatterPlugin` | `parse`의 `frontmatter`. 기본값이 켬입니다. 문서에 남고 그려지지는 않으며, 원문 화면에서 편집합니다 |
| `directivesPlugin` | [`directives`](../guide/viewer#디렉티브). `:::name[label]{key=value}`로 문법이 같고, 등록한 컴포넌트가 그립니다 |
| `searchPlugin` | 툴바의 `find`와 `Mod`+`F`. [찾기](../guide/editor#찾기) |
| `maxLengthPlugin` | — 문서는 애플리케이션의 상태입니다. 길이는 거기서 재세요 |
| `jsxPlugin` | — 여기서 JSX를 읽는 것은 없습니다 |

## 프롭

| MDXEditor | Mawy | 비고 |
| --- | --- | --- |
| `markdown` | `defaultValue` | 문서를 애플리케이션이 쥔다면 `value` |
| `onChange` | `onChange` | 인자 하나입니다. 아무것도 정규화하지 않으므로 무시할 최초 변경도 없습니다 |
| `readOnly` | `readOnly` 또는 [`MawyViewer`](../api/components/mawy-viewer) | 아래를 보세요 |
| `placeholder` | `placeholder` |  |
| `autoFocus` | — | 마운트 후 `handle.focus()` |
| `onBlur` | — | 에디터를 감싼 엘리먼트에서 들으세요 |
| `onError` | — | 실패할 파싱이 없습니다. 모든 문서는 마크다운이고, 문법이 아닌 텍스트는 텍스트입니다 |
| `toMarkdownOptions` | — | 문서를 써내는 것이 없습니다 |
| `trim` | — | 건넨 그대로, 공백까지 그대로 둡니다 |
| `suppressHtmlProcessing` | [`html`](../api/types/html-policy) | 기본값 `escape`가 HTML을 문자 그대로 그립니다 |
| `translation` | `locale`, `strings` |  |
| `iconComponentFor` | — | 아이콘은 이 패키지의 유일한 의존성인 [Lucide](https://lucide.dev)입니다 |
| `contentEditableClassName`, `lexicalTheme` | [`--mawy-*` 토큰](../api/theming) | 테마는 클래스가 아니라 커스텀 프로퍼티 재선언입니다 |
| `spellCheck` | — | 원문 화면은 진짜 `<textarea>`라 플랫폼의 맞춤법 검사가 그대로 걸립니다 |
| `overlayContainer` | — | 바는 에디터 안에 그립니다 |

## 읽기 전용 문서

MDXEditor의 문서는 읽기만 하는 내용에 `readOnly`를 쓰지 말고 원하는 렌더러를 쓰라고 권합니다. 그 렌더러가 이 패키지 안에 있습니다.

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

에디터가 미리보기에 쓰는 바로 그 렌더러라서 둘이 문서를 다르게 읽을 수 없습니다. 게시하는 페이지라면 [`MawyDocument`](../api/components/mawy-document)가 같은 것을 서버에서 그리고 자바스크립트는 내려보내지 않습니다. MDXEditor가 서버 렌더링을 지원하지 않아 문서가 안내하는 `ssr: false` 동적 임포트도 이것으로 사라집니다.

## 문서

**MDXEditor는 직렬화하면서 문서를 다시 씁니다.** `onChange`가 최초 값을 넣을 때 생기는 변경을 두 번째 인자로 알리는 이유가 그것입니다. API 문서는 원인을 "additional whitespace, bullet symbols different than the configured ones"라고 적었습니다. 데이터베이스에 있는 것은 그 직렬화기가 남긴 결과이고 유효한 마크다운입니다. 여기서부터 파일은 작성자의 텍스트이고 그대로 남습니다.

실제 문서를 열고 볼 것이 둘 있습니다.

- **원시 HTML.** MDXEditor는 `suppressHtmlProcessing`을 켜지 않는 한 HTML을 자체 노드로 읽습니다. 여기 기본값은 `escape`라 마크업을 쓰인 문자 그대로 그립니다. 그려져야 하는 문서라면 `html="sanitize"`를 넘기고 [안전](../guide/viewer#안전)을 먼저 읽으세요.
- **MDX에 속하는 것 전부.** 문서 안의 `import` 줄과 `export`, `<Component />`는 이 파서에게 텍스트입니다. 쓰던 에디터를 걷어내기 전에 문서를 훑어 두세요.
