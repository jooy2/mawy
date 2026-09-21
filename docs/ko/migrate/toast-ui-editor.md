---
title: Toast UI Editor에서
order: 1
---

# Toast UI Editor에서 옮겨오기

Toast UI Editor의 옵션과 메서드, 플러그인이 Mawy에서 무엇이 되는지, 그리고 여기에 대응이 없는 것은 무엇인지 적었습니다.

`@toast-ui/editor` 3.2.2와 `@toast-ui/react-editor` 3.2.3을 보고 썼습니다. 둘 다 마지막 릴리스입니다. 저장소는 2023년 2월 3.2.2와 함께 아카이브되었습니다. 이 사이트에 오른 에디터 중에서는 그것이 가장 먼저 알아야 할 사실이고, 이 문서가 있는 이유이기도 합니다.

둘은 보기보다 가깝습니다. Toast UI Editor도 원문 화면과 위지윅 화면, 뷰어를 가진 마크다운 에디터이고, 툴킷이 아니라 패키지입니다. 갈라지는 곳은 문서가 어디에 있느냐입니다. 저쪽은 ProseMirror 문서를 들고 마크다운으로 변환하고, Mawy는 마크다운을 편집합니다.

::: fw flutter

Toast UI Editor는 웹 라이브러리라 여기 적힌 것이 Flutter 마이그레이션은 아닙니다. 넘어오는 것은 문서입니다. 그 에디터에서 쓴 문서를 React 패키지와 같은 파서가 읽고, 이 패키지에 없는 화면은 `wysiwyg` 하나입니다. 이유는 [에디터](../guide/editor)에 있습니다.

:::

## 컴포넌트

```tsx
import '@toast-ui/editor/dist/toastui-editor.css';
import { Editor } from '@toast-ui/react-editor';

export function Page() {
  const editor = useRef<Editor>(null);

  return (
    <Editor
      initialValue={document}
      initialEditType="markdown"
      previewStyle="vertical"
      height="600px"
      usageStatistics={false}
      onChange={() => save(editor.current?.getInstance().getMarkdown())}
      ref={editor}
    />
  );
}
```

이것이

```tsx
import { MawyEditor } from 'mawy-react';

export function Page() {
  return <MawyEditor defaultValue={document} defaultMode="split" onChange={save} />;
}
```

이렇게 됩니다. `onChange`가 문서를 그대로 넘겨주므로 ref와 `getInstance().getMarkdown()`은 사라집니다. 스타일시트는 `mawy-react/styles.css` 하나이고, 컴포넌트마다가 아니라 CSS 진입점에서 한 번 가져옵니다.

**여기에 `usageStatistics`가 없는 이유는 끌 것이 없어서입니다.** Toast UI Editor는 그 옵션을 넘기지 않으면 페이지의 호스트명을 Google Analytics로 보냅니다. 이 패키지는 자체적으로 어떤 요청도 보내지 않습니다.

## 옵션

| Toast UI Editor | Mawy | 비고 |
| --- | --- | --- |
| `el` | — | React 컴포넌트라 건넬 엘리먼트가 없습니다 |
| `initialValue` | `defaultValue` | 문서를 애플리케이션이 쥔다면 `value` |
| `initialEditType: 'markdown'` | `defaultMode="plain"` | `previewStyle: 'vertical'`까지 합치면 `"split"` |
| `initialEditType: 'wysiwyg'` | `defaultMode="wysiwyg"` |  |
| `previewStyle: 'vertical'` | `defaultMode="split"` | 두 판 사이의 바를 잡고 끌 수 있습니다 |
| `previewStyle: 'tab'` | `modes={['plain', 'preview']}` | 화면 전환 컨트롤이 그 탭입니다 |
| `hideModeSwitch` | `modes={['plain']}` | 모드가 하나면 전환 컨트롤이 사라집니다 |
| `height`, `minHeight` | — | 에디터는 컨테이너를 채웁니다. 높이는 컨테이너에 주세요 |
| `placeholder` | `placeholder` |  |
| `autofocus` | — | 마운트 후 [`handle.focus()`](../api/components/mawy-editor#에디터-밖에서) |
| `events.change` | `onChange` | 빈손이 아니라 문서를 들고 호출됩니다 |
| `events.focus`, `events.blur` | — | 에디터는 DOM 서브트리입니다. 감싼 엘리먼트에서 들으세요 |
| `hooks.addImageBlobHook` | [`onUploadImage`](../api/components/mawy-editor#이미지) | 콜백을 부르는 대신 URL을 돌려줍니다 |
| `language` | `locale`, `strings` | 영어와 한국어가 함께 배포되고, 나머지는 `strings` |
| `theme: 'dark'` | `defaultColorScheme="dark"` | 애플리케이션이 쥔다면 `colorScheme` |
| `toolbarItems` | [`toolbar`](../api/types/editor-toolbar-item) | 중첩 없는 이름 목록이고 `'separator'`도 이름입니다 |
| `useCommandShortcut` | — | 단축키는 항상 켜져 있습니다 |
| `frontMatter` | `parse`의 `frontmatter` | 여기서는 기본값이 켬입니다 |
| `referenceDefinition` | — | `[label]: url` 정의는 언제나 읽습니다 |
| `extendedAutolinks` | `parse`의 `autolinkSchemes` | GFM이 읽는 웹 주소 너머까지 자동 링크로 넓힙니다 |
| `linkAttributes` | `linkTarget`, `linkRel` |  |
| `customHTMLSanitizer` | [`html`](../api/types/html-policy) | 함수가 아니라 정책입니다. `escape`, `sanitize`, `raw` |
| `customHTMLRenderer` | [`directives`](../guide/viewer#디렉티브), `image` |  |
| `widgetRules` | [`directives`](../guide/viewer#디렉티브) | 파서가 읽는 이름 붙은 모양을 애플리케이션의 컴포넌트가 그립니다 |
| `customMarkdownRenderer` | — | 여기서 마크다운을 쓰는 것은 편집 커맨드뿐입니다 |
| `usageStatistics` | — | 끌 요청이 없습니다 |
| `viewer: true` | [`MawyViewer`](../api/components/mawy-viewer) | 별도 컴포넌트입니다 |

## 메서드

| Toast UI Editor | Mawy |
| --- | --- |
| `getMarkdown()` | 문서는 이미 애플리케이션의 상태입니다 |
| `setMarkdown(value)` | 그 상태를 바꾸세요 |
| `getHTML()` | 서버에서 [`MawyDocument`](../api/components/mawy-document). 문자열이 필요하면 `renderToStaticMarkup` |
| `insertText(text)` | `handle.insert(markdown)` |
| `changeMode(type)` | `mode` 프롭 |
| `exec(name)` | — 툴바 버튼과 단축키, 또는 쓰려던 것을 `handle.insert` |
| `focus()` | `handle.focus()` |
| `destroy()` | 언마운트하면 됩니다 |
| `on`, `off`, `addHook` | `onChange`, `onModeChange`, `onColorSchemeChange` |

## 플러그인

여기에는 플러그인 체계가 없으므로 Toast UI Editor의 공식 플러그인 다섯에 플러그인으로 대응하는 것은 없습니다. 둘은 다른 답이 있습니다.

| 플러그인 | 여기서는 |
| --- | --- |
| `editor-plugin-code-syntax-highlight` | 패키지에 함께 들어 있는 [`highlight`](../api/functions/mawy-highlighter) |
| `editor-plugin-chart`, `editor-plugin-uml` | [디렉티브](../guide/viewer#디렉티브)와 직접 만든 컴포넌트. 문법이 바뀝니다. 펜스 블록이 아니라 `:::chart`입니다 |
| `editor-plugin-color-syntax` | — 문서에 `<span style>`을 쓰는 플러그인입니다. 그것은 원시 HTML이고 기본 정책에서는 문자 그대로 그려집니다 |
| `editor-plugin-table-merged-cell` | — 병합 셀은 GFM이 아닙니다. 그 표기를 쓴 문서는 그 에디터에서와 나머지 모든 곳에서 다른 뜻이 됩니다 |

## 뷰어

읽기 전용 화면을 `Viewer`로 만들었다면

```tsx
import { Viewer } from '@toast-ui/react-editor';

<Viewer initialValue={document} />;
```

이것이

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

이렇게 됩니다. 여기서 뷰어는 에디터의 미리보기 판과 같은 것이라, 읽는 사람이 보는 화면이 곧 쓰던 사람이 보던 화면입니다. 글자 크기와 줄 높이, 테마, 단 너비를 다루는 툴바가 함께 오고 `toolbar={false}`로 전부 뺍니다. 브라우징이 아니라 게시하는 페이지라면 [`MawyDocument`](../api/components/mawy-document)를 쓰세요. 같은 그림을 자바스크립트 없이 내려보냅니다.

## 문서

**Toast UI Editor의 위지윅 화면에서 저장된 문서는 이미 그 에디터의 마크다운 렌더러를 한 번 거쳤습니다.** 목록 기호와 강조 문자, 줄바꿈은 작성자의 것이 아니라 그 렌더러의 것입니다. 여전히 올바른 마크다운이고 읽는 내용도 같습니다. 되찾을 것이 없을 뿐이고, 여기서 다시 고쳐 쓰지도 않습니다.

문서를 하나 열어 확인할 차이가 둘 있습니다.

- **`[label]: url` 정의를 여기서는 언제나 읽습니다.** `referenceDefinition`이 꺼져 있어 Toast UI Editor가 읽지 않는 데 기대던 문서라면, 대괄호가 보이던 자리에 링크가 그려집니다.
- **원시 HTML은 기본적으로 문자 그대로 그립니다.** Toast UI Editor는 정제한 뒤 그립니다. 문서에 그려져야 할 마크업이 들어 있다면 `html="sanitize"`를 넘기고, 서버에서 무엇이 그려지고 무엇이 그려지지 않는지 [안전](../guide/viewer#안전)을 읽으세요.
