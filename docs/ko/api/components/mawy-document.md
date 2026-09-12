---
title: MawyDocument
order: 3
---

# `MawyDocument`

문서를 서버에서 한 번 그리고, 그것을 위한 자바스크립트는 하나도 보내지 않습니다.

::: fw flutter

이것은 React 패키지의 것입니다. Flutter 애플리케이션은 문서를 기기에서 그리므로 서버 쪽 절반이라는 것이 없고, 이 패키지가 그리는 것은 [`MawyViewer`](./mawy-viewer)가 전부입니다.

:::

::: fw react

`MawyViewer`도 서버에서 잘 렌더링되고 그다음 하이드레이션합니다. 뷰어가 독자에게 주는 것은 모두 동작이기 때문입니다. 툴바도 찾기 바도 개요도 복사 버튼도 컴포넌트가 페이지에 있어야 합니다. 문서 사이트나 블로그, 변경 기록에는 그중 무엇도 필요 없고, 문서 한 페이지가 40킬로바이트의 자바스크립트를 싣지 않도록 `mawy-react/server`가 있습니다.

```tsx
import { MawyDocument } from 'mawy-react/server';
import 'mawy-react/styles.css';

export default async function Page() {
  return <MawyDocument value={await readFile('README.md', 'utf8')} />;
}
```

React 서버 컴포넌트를 가진 프레임워크에서는 서버 컴포넌트로, 없는 곳에서는 `renderToStaticMarkup`에 넘길 평범한 컴포넌트로 씁니다. 마크업도 스타일시트도 같은 것이므로, 이렇게 만든 페이지와 뷰어를 올린 페이지는 똑같이 보입니다.

## 프롭

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 마크다운. |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `{ gfm: true, breaks: false, definitionLists: true }` | 어떻게 읽을지. |
| `html` | [`MawyHtmlPolicy`](../types/html-policy) | `'escape'` | 안에 쓰인 날 HTML을 어떻게 할지. |
| `linkTarget` | [`MawyLinkTarget`](../types/link-target) | `'blank'` | 문서가 쓴 링크가 어디에서 열릴지. |
| `directives` | [`MawyDirectives`](../types/directives) | — | 이 패키지가 모르는 구성물을 무엇으로 그릴지. |
| `resolveUrl` | [`MawyUrlResolver`](../types/url-resolver) | — | 문서의 상대 URL이 어디를 가리키는지. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | 이 라이브러리가 직접 쓰는 몇 낱말의 언어. |
| `highlight` | [`MawyHighlighter`](../types/highlighter) | — | 코드 블록에 색을 입히는 것. |
| `typography` | [`MawyTypography`](../types/typography) | — | 문서 조판. 같은 커스텀 속성으로 나갑니다. |
| `fonts` | [`MawyFont`](../types/font)`[]` | `MAWY_SYSTEM_FONTS` | 그 속성이 이름 댈 수 있는 글꼴. |
| `colorScheme` | `'light' \| 'dark' \| null` | `null` | 어느 팔레트로 그릴지. `null`은 페이지에 맡깁니다. |
| `className` | `string` | — | 가장 바깥 엘리먼트에, 이 라이브러리의 이름 뒤에 붙습니다. |
| `style` | `CSSProperties` | — | 조판이 쓴 커스텀 속성 위에 병합됩니다. |

## 없는 것과 그 이유

- **툴바도 찾기 바도 개요도 없습니다.** 모두 동작하려면 자바스크립트가 필요한데 여기에는 없습니다. 필요하면 [`MawyViewer`](./mawy-viewer)를 쓰세요.
- **코드 블록의 복사 버튼도 없습니다.** 같은 이유입니다.
- **`html="sanitize"`는 마크업을 글자 그대로 그립니다.** 위생 처리에는 파싱할 DOM이 필요한데 서버에는 없습니다. `MawyViewer`도 서버에서는 같지만, 거기서는 다음 렌더에 엘리먼트가 도착합니다. 여기에는 다음 렌더가 없습니다. `html="raw"`는 저자가 쓴 대로 마크업을 내보내고, [그것이 뜻하는 모든 것](../../guide/viewer#안전)이 따라옵니다.
- **하이라이터는 동기로 답할 때만 쓰입니다.** 프로미스가 도착할 두 번째 렌더가 없습니다. `mawyHighlighter`처럼 동기로 답하는 하이라이터를 넘기면 색이 HTML 안에 들어갑니다.
- **`data-mawy-range`가 어디에도 없습니다.** `MawyViewer`가 그린 엘리먼트는 모두 자기가 그려져 나온 위치를 지니고, 그것으로 화면의 한 지점을 문서의 위치로 되돌립니다. [원문 위치 추적](../../guide/viewer#원문-위치-추적)을 보세요. 이렇게 만든 페이지에서 그 물음을 던지는 것은 없고, 속성은 HTML의 4분의 1을 차지합니다. 이 저장소의 README가 16.8 kB 대신 12.2 kB, gzip으로는 4.6 kB 대신 3.4 kB로 나옵니다.

:::
