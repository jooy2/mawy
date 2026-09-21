---
title: react-md-editor에서
order: 4
---

# react-md-editor에서 옮겨오기

`@uiw/react-md-editor`의 각 프롭이 Mawy에서 무엇이 되는지, 그리고 문서의 겉모습을 바꾸는 기본값 하나를 적었습니다.

`@uiw/react-md-editor` 4를 보고 썼습니다. 네 경우 중 가장 짧습니다. 그 에디터는 미리보기를 옆에 둔 `textarea`라서 문서를 이미 마크다운 문자열 그대로 쥐고 있고, 여기도 그렇습니다. 들어올 때 고쳐 쓴 것이 없고 나갈 때도 없습니다.

바뀌는 것은 미리보기와 그 주변입니다. 저쪽 미리보기는 같은 문자열을 remark와 rehype로 그리는 `@uiw/react-markdown-preview`이고 `previewOptions`로 설정합니다. 여기 미리보기는 [`MawyViewer`](../api/components/mawy-viewer)가 쓰는 이 라이브러리의 렌더러이고, 플러그인 목록이 아니라 `parse`와 `html`, `directives`로 설정합니다.

::: fw flutter

`@uiw/react-md-editor`는 React 컴포넌트라 Flutter 애플리케이션 안에서 옮겨올 것은 없습니다. 문서는 그대로 넘어오고, 이 패키지에 없는 화면은 `wysiwyg` 하나입니다. 이유는 [에디터](../guide/editor)에 있습니다.

:::

## 컴포넌트

```tsx
import MDEditor from '@uiw/react-md-editor';

<MDEditor value={document} onChange={(value) => save(value ?? '')} preview="live" height={600} />;
```

이것이

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor value={document} onChange={save} defaultMode="split" />;
```

이렇게 됩니다. `onChange`가 `string | undefined`가 아니라 `string`을 넘기므로 `?? ''`가 사라집니다. 에디터는 컨테이너를 채우므로 높이는 컨테이너의 몫입니다.

## 프롭

| react-md-editor | Mawy | 비고 |
| --- | --- | --- |
| `value` | `value` | 에디터가 문서를 쥐게 하려면 `defaultValue` |
| `onChange` | `onChange` | 인자 하나이고 `undefined`가 오지 않습니다 |
| `preview: 'live'` | `defaultMode="split"` | 두 판 사이의 바를 잡고 끌 수 있습니다 |
| `preview: 'edit'` | `defaultMode="plain"` |  |
| `preview: 'preview'` | `defaultMode="preview"` |  |
| `hideToolbar` | `toolbar={false}` |  |
| `commands`, `extraCommands` | [`toolbar`](../api/types/editor-toolbar-item) | 원하는 순서의 이름 목록이고 `'separator'`도 이름입니다 |
| `commandsFilter` | — | 목록에서 이름을 빼세요 |
| 직접 만든 커맨드 | — | 직접 만든 버튼과 `handle.insert(markdown)`. [에디터 밖에서](../api/components/mawy-editor#에디터-밖에서) |
| `height`, `minHeight`, `maxHeight` | — | 감싼 엘리먼트의 CSS |
| `visibleDragbar` | — | 여기 바는 에디터 아래가 아니라 두 판 사이에 있습니다 |
| `textareaProps` | `placeholder`, `readOnly` | 이름이 있는 것에는 프롭이 있고, 화면 자체를 넘겨주지는 않습니다 |
| `previewOptions` | `parse`, `html`, [`directives`](../guide/viewer#디렉티브), `highlight` | 아래를 보세요 |
| `components` | `image`, `directives` | 그리는 일은 라이브러리의 것이고, 이 둘이 그 안의 창구입니다 |
| `tabSize` | — | 두 칸입니다. 중첩된 목록 기호가 요구하는 폭입니다. [들여쓰기](../guide/editor#들여쓰기) |
| `defaultTabEnable` | — | `Escape` 다음 `Tab`으로 에디터를 빠져나가므로, `Tab`이 포커스를 가두지 않고 들여쓸 수 있습니다 |
| `highlightEnable` | — | 원문은 언제나 색칠합니다. `lineNumbers`로 좌측 눈금을 끕니다 |
| `enableScroll` | — | `split`에서 미리보기는 위치 비율이 아니라 블록을 따라갑니다 |
| `fullscreen`, `overflow` | — | 페이지 위를 덮는 것이 없습니다 |
| `autoFocus`, `autoFocusEnd` | — | 마운트 후 `handle.focus()` |
| `onStatistics` | [`status`](../api/types/editor-status-item) | 아래에 숫자를 그립니다. 위치, 선택, 줄, 단어, 문자, 바이트 |
| `onHeightChange` | — |  |
| 상위 요소의 `data-color-mode` | `defaultColorScheme`, `colorScheme` | 팔레트가 컴포넌트와 함께 다니므로 밝은 페이지 안에서 에디터 하나만 어둡게 둘 수 있습니다 |

## 미리보기

`previewOptions`는 별도 패키지인 렌더러에 remark와 rehype 플러그인을 넘깁니다. 여기에는 플러그인 목록이 없으므로 각각 답이 따로 있습니다.

| 넘기던 것 | 여기서는 |
| --- | --- |
| `remark-gfm` | — 표와 태스크 목록, 취소선, 각주, 알림을 기본으로 읽습니다. `parse`에 `gfm: false`를 넘기면 끕니다 |
| `rehype-sanitize` | [`html`](../api/types/html-policy). 기본값이 `escape`라 안전해지기 위해 더할 것이 없습니다 |
| `rehype-prism-plus`를 비롯한 하이라이터 | 패키지에 함께 들어 있는 [`highlight`](../api/functions/mawy-highlighter) |
| `remark-math`, KaTeX | — 수식이 없습니다 |
| Mermaid나 차트 렌더러 | [디렉티브](../guide/viewer#디렉티브)와 직접 만든 컴포넌트. 펜스 블록이 아니라 `:::mermaid`로 씁니다 |
| `<!--rehype:style=...-->` 주석 | — HTML 주석은 주석입니다 |

## 읽기 전용 문서

`MDEditor.Markdown`이 `MawyViewer`가 됩니다.

```tsx
<MDEditor.Markdown source={document} />
```

```tsx
<MawyViewer value={document} />
```

뷰어에는 글자 크기와 줄 높이, 테마, 단 너비를 다루는 자체 툴바가 함께 오고, 읽는 대상이 아니라 페이지의 일부인 문서라면 `toolbar={false}`로 전부 뺍니다. 게시하는 페이지에서는 [`MawyDocument`](../api/components/mawy-document)가 같은 문서를 서버에서 그리고 자바스크립트를 내려보내지 않습니다. 그 에디터의 README가 Next.js에 안내하는 `ssr: false` 동적 임포트도 이것으로 사라집니다.

## 문서

**문서의 겉모습을 바꾸는 기본값이 하나 있고, 원시 HTML입니다.** `@uiw/react-md-editor`는 문서 안의 HTML을 그립니다. 작성자를 완전히 믿지 못한다면 `rehype-sanitize`를 추가하라고 README가 안내하는 이유입니다. 여기 기본값은 `escape`라 문서 속 `<div>`는 `<div>`라는 문자로 그려집니다. 마크업이 그려져야 하는 문서라면

```tsx
<MawyEditor value={document} html="sanitize" />
```

이렇게 넘깁니다. 그 전에 [안전](../guide/viewer#안전)을 읽으세요. `sanitize`는 DOM 없이 짧고 의도적인 목록만 그리고, 그 목록에 없는 것은 서버에서 문자로 그립니다.

나머지는 그대로 넘어옵니다. 데이터베이스에 있는 텍스트는 두 에디터 모두에서 작성자가 친 텍스트입니다.

## 얻는 것

타이핑할 수 있는 그려진 문서입니다. `wysiwyg`는 화면 전환에서 가장 먼저 나오고, 뒤에 두 번째 모델을 두지 않은 채 그려진 자리에서 문서를 편집합니다. 마크다운 문자열이 그대로 문서로 남습니다. 쓰는 사람에게 나란한 두 판이 맞다면 `modes={['plain', 'split', 'preview']}`로 빼세요.
