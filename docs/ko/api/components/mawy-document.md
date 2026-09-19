---
title: MawyDocument
order: 3
---

# `MawyDocument`

뷰어를 두르지 않은 문서입니다. 툴바도 찾기 바도 개요도 없고, 거기 딸린 동작도 없습니다.

::: fw react

문서를 서버에서 한 번 그리고, 그것을 위한 자바스크립트는 하나도 보내지 않습니다.

`MawyViewer`도 서버에서 잘 렌더링되고 그다음 하이드레이션합니다. 뷰어가 독자에게 주는 것은 모두 동작이기 때문입니다. 툴바도 찾기 바도 개요도 복사 버튼도 컴포넌트가 페이지에 있어야 합니다. 문서 사이트나 블로그, 변경 기록에는 그중 무엇도 필요 없고, 문서 한 페이지가 40킬로바이트의 자바스크립트를 싣지 않도록 `mawy-react/server`가 있습니다.

```tsx
import { MawyDocument } from 'mawy-react/server';
import 'mawy-react/styles.css';

export default async function Page() {
  return <MawyDocument value={await readFile('README.md', 'utf8')} />;
}
```

React 서버 컴포넌트를 가진 프레임워크에서는 서버 컴포넌트로, 없는 곳에서는 `renderToStaticMarkup`에 넘길 평범한 컴포넌트로 씁니다. 마크업도 스타일시트도 같은 것이므로, 이렇게 만든 페이지와 뷰어를 올린 페이지는 똑같이 보입니다.

검색 엔진을 거쳐 찾아오는 페이지라면 이 컴포넌트 둘레에 무엇이 있어야 하는지는 [게시하기](../../guide/publishing)가 전부 다룹니다.

:::

::: fw flutter

스크롤은 다른 것이 맡는 자리에 그리는 문서입니다.

[`MawyViewer`](./mawy-viewer)는 화면 하나입니다. 툴바와 찾기 바와 개요가 있고, 자기 스크롤 뷰를 가지며, 받은 높이를 그대로 씁니다. 앉아서 읽는 문서에는 그것이 맞고, 목록의 한 항목으로 놓이는 문서에는 맞지 않습니다. 대화 속 메시지, 피드의 한 글, 세로로 쌓인 카드가 그런 자리입니다. 스크롤 뷰 안의 스크롤 뷰에는 받을 높이가 없으므로, 뷰어는 짧게 그려지는 대신 레이아웃에서 예외를 냅니다.

그래서 이것은 그리기만 남긴 것입니다. 파서도 렌더러도 팔레트도 정책도 뷰어와 같고, 문서 높이만큼만 차지하는 열로 놓입니다.

```dart
import 'package:mawy/mawy.dart';

ListView(
  children: <Widget>[
    for (final Message message in messages)
      MawyDocument(value: message.body, padding: EdgeInsets.zero),
  ],
);
```

React 패키지는 같은 위젯에 반대쪽에서 닿았습니다. 그쪽은 자바스크립트를 싣지 않는 페이지, 이쪽은 아무것도 스크롤하지 않는 위젯이고, 둘 다 뷰어를 두르지 않은 문서입니다.

:::

## 프롭

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 마크다운. |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `{ gfm: true, breaks: false, definitionLists: true, headingIds: true, frontmatter: true, typographer: false, autolinkSchemes: false }` | 어떻게 읽을지. |
| `html` | [`MawyHtmlPolicy`](../types/html-policy) | `'escape'` | 안에 쓰인 날 HTML을 어떻게 할지. |
| `linkTarget` | [`MawyLinkTarget`](../types/link-target) | `'blank'` | 문서가 쓴 링크가 어디에서 열릴지. |
| `linkRel` | [`MawyLinkRel`](../types/link-target#mawylinkrel) | — | 그 링크가 가는 곳에 대해 무엇을 밝힐지. 이미 밝힌 것에 더합니다. |
| `links` | [`MawyLinkPolicy`](../types/drawing-policy#mawylinkpolicy) | `'show'` | 문서가 쓴 링크를 링크로, 낱말로, 원문으로 그릴지, 아예 그리지 않을지. |
| `images` | [`MawyImagePolicy`](../types/drawing-policy#mawyimagepolicy) | `'show'` | 그림을 내려받아, 설명으로, 원문으로 그릴지, 아예 그리지 않을지. |
| `directives` | [`MawyDirectives`](../types/directives) | — | 이 패키지가 모르는 구성물을 무엇으로 그릴지. |
| `image` | `ComponentType<`[`MawyImageProps`](../types/image)`>` | — | 문서가 가리키는 그림을 무엇으로 그릴지. 프레임워크의 이미지 컴포넌트를 꽂는 자리입니다. |
| `resolveUrl` | [`MawyUrlResolver`](../types/url-resolver) | — | 문서의 상대 URL이 어디를 가리키는지. |
| `headingBase` | `number` | `1` | 문서의 `#`을 `h1`부터 `h6` 중 무엇으로 그릴지. |
| `headingAnchors` | `boolean` | `true` | 제목마다 그 제목으로 가는 `#`을 옆에 그릴지. |
| `anchorPrefix` | `string` | — | 이 그림이 제목과 각주에 주는 앵커 앞에 붙일 것. 한 페이지에 문서가 둘일 때 이름이 부딪히지 않게 합니다. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | 이 라이브러리가 직접 쓰는 몇 낱말의 언어. |
| `strings` | `Partial<`[`MawyStrings`](../types/locale#mawystrings)`>` | — | 인터페이스의 낱말 일부나 전부. 나머지는 `locale`에서 가져옵니다. |
| `highlight` | [`MawyHighlighter`](../types/highlighter) | — | 코드 블록에 색을 입히는 것. |
| `typography` | `Partial<`[`MawyTypography`](../types/typography)`>` | — | 문서 조판. 같은 커스텀 속성으로 나갑니다. 빠뜨린 값은 기본값을 씁니다. |
| `fonts` | [`MawyFont`](../types/font)`[]` | `MAWY_SYSTEM_FONTS` | 그 속성이 이름 댈 수 있는 글꼴. |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme)` \| null` | `null` | 어느 팔레트로 그릴지. `null`은 아무것도 쓰지 않고 페이지에 맡깁니다. |
| `className` | `string` | — | 가장 바깥 엘리먼트에, 이 라이브러리의 이름 뒤에 붙습니다. |
| `style` | `CSSProperties` | — | 조판이 쓴 커스텀 속성 위에 병합됩니다. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `String` | 필수 | 문서, 마크다운 그대로. |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `MawyParseOptions()` | 마크다운을 어떻게 읽을지. |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme) | `MawyColorScheme.system` | 팔레트. `system`은 플랫폼을 따릅니다. |
| `tokens` | [`MawyTokensBuilder?`](../theming) | 스타일시트의 값 | 어떤 색으로 그릴지. 정해진 밝기를 받아 돌려줍니다. |
| `typography` | [`MawyTypography`](../types/typography) | `MawyTypography()` | 문서를 어떻게 조판할지. |
| `locale` | [`MawyLocale`](../types/locale) | `MawyLocale.en` | 이 패키지가 직접 쓰는 몇 낱말의 언어. |
| `strings` | [`MawyStrings?`](../types/locale#mawystrings) | — | 그 낱말을 애플리케이션이 직접 줄 때. 주면 `locale`은 아무 말도 하지 않습니다. |
| `onLinkTap` | `void Function(String url, String? title)?` | — | 탭한 링크가 하는 일. |
| `links` | [`MawyLinkPolicy`](../types/drawing-policy#mawylinkpolicy) | `MawyLinkPolicy.show` | 문서가 쓴 링크를 어떻게 그릴지. 링크로, 낱말로, 쓰인 글자로, 또는 그리지 않음. |
| `images` | [`MawyImagePolicy`](../types/drawing-policy#mawyimagepolicy) | `MawyImagePolicy.show` | 그림을 어떻게 그릴지. 내려받아서, 설명으로, 쓰인 글자로, 또는 그리지 않음. |
| `directives` | `Map<String, `[`MawyDirectiveBuilder`](../types/directives)`>?` | — | 이 패키지가 모르는 구성 요소를 무엇이 그릴지. |
| `imageBuilder` | [`MawyImageBuilder?`](../types/image) | 패키지가 그립니다 | 문서가 가리키는 그림을 무엇이 그릴지. |
| `resolveUrl` | [`MawyUrlResolver?`](../types/url-resolver) | — | 문서에 쓰인 상대 URL이 어디를 가리키는지. |
| `highlight` | [`MawyHighlighter?`](../types/highlighter) | — | 펜스 코드 블록에 무엇이 색을 입힐지. 기본은 없음. |
| `padding` | `EdgeInsetsGeometry?` | 스타일시트와 같은 값 | 글 둘레의 여백. |

여기에도 `html` 인자는 없고 앞으로도 없습니다. 문서 안에 쓴 원시 HTML은 쓰인 글자 그대로 그립니다. 그것을 그릴 HTML이 여기에는 없기 때문입니다.

`padding`의 기본값은 스타일시트가 그려진 문서에 주는 여백과 같습니다. 그래서 같은 문서를 어느 패키지로 그려도 같게 조판됩니다. 목록의 한 항목으로 놓이는 문서라면 대개 `EdgeInsets.zero`를 주고 목록이 이미 가진 여백을 씁니다.

:::

## 독자의 팔레트 따라가기

::: fw react

`colorScheme`의 기본값은 `null`이고, 그러면 속성을 아예 쓰지 않습니다. `--mawy-*` 토큰을 직접 정하는 애플리케이션이 원하는 값입니다. 여기서 팔레트를 선언하면 그쪽 팔레트와 다툴 것이 하나 늘어날 뿐입니다.

동시에 어두운 화면에서도 문서가 밝다는 뜻이기도 합니다. 스타일시트가 `prefers-color-scheme`으로 문서를 어둡게 하는 것은 속성이 `system`이라고 말한 경우뿐이기 때문입니다. 자기 팔레트가 없는 페이지는 그렇다고 말하면 됩니다.

```tsx
<MawyDocument value={post.body} colorScheme="system" />
```

[`MawyViewer`](./mawy-viewer)가 기본으로 하는 일입니다. 기본값이 다른 것은 의도한 것입니다. 뷰어는 독자가 바라보는 화면이고, 이쪽은 남의 페이지에 놓인 한 조각입니다.

:::

::: fw flutter

`colorScheme`의 기본값은 플랫폼을 따르는 `MawyColorScheme.system`입니다. React 패키지의 기본값이 팔레트를 아예 쓰지 않는 것과 다릅니다. 플랫폼이 다르기 때문입니다. 그쪽에서 문서는 자기 팔레트를 가진 페이지의 한 조각이고, 여기서는 위젯 둘레에 팔레트를 두고 다툴 것이 없습니다.

팔레트에는 문서가 앉는 바닥도 딸려 옵니다. 글자에는 닿고 그 아래에는 닿지 않는 팔레트는 절반짜리이기 때문입니다. 바닥을 이미 칠해 둔 애플리케이션은 그렇다고 말하면 됩니다.

```dart
MawyDocument(
  value: message.body,
  tokens: (Brightness brightness) =>
      MawyTokens.of(brightness).copyWith(background: const Color(0x00000000)),
);
```

:::

## `MawyViewer`에서 옮겨 오기

::: fw react

문서를 _어떻게_ 그릴지에 대한 것은 둘 다 같은 이름에 같은 타입입니다. 그래서 페이지를 옮기는 일은 동작에 해당하던 prop을 지우는 것이 전부입니다. `toolbar`, `empty`, `fileDrop`, `accept`, 그리고 제어와 비제어 짝들입니다. 나머지는 다시 쓸 것이 없습니다.

일부러 공유하지 않는 것이 둘 있고, 컴파일러가 둘 다 짚어 줍니다.

- **`value`는 여기서 필수입니다.** 문서가 없는 뷰어는 파일 선택기입니다. 문서가 없는 문서는 아무것도 아닙니다.
- **`highlight`는 하이라이터만 받습니다.** 뷰어는 하이라이터를 가져오는 함수도 받습니다. 프로미스가 도착할 두 번째 렌더가 없으니, 받아 놓고 무시하는 것보다 거절하는 편이 낫습니다.

:::

::: fw flutter

문서를 _어떻게_ 그릴지에 대한 것은 둘 다 같은 이름에 같은 타입입니다. 그래서 옮기는 일은 화면에 해당하던 인자를 지우는 것이 전부입니다. `toolbar`, `frame`, `toolbarPlacement`, `scrollController`, `anchors`, 그리고 툴바가 움직이던 짝인 `defaultTypography`, `onTypographyChange`, `onColorSchemeChange`입니다.

한 번 더 볼 것은 `typography`입니다. 여기서는 제어 짝의 한쪽이 아니라 값 하나입니다. 독자에게 조판 컨트롤을 주는 것이 없으므로, 애플리케이션이 넘긴 값이 곧 문서의 조판입니다.

:::

## 없는 것과 그 이유

::: fw react

- **툴바도 찾기 바도 개요도 없습니다.** 모두 동작하려면 자바스크립트가 필요한데 여기에는 없습니다. 필요하면 [`MawyViewer`](./mawy-viewer)를 쓰세요.
- **코드 블록의 복사 버튼도 없습니다.** 같은 이유입니다.
- **`html="sanitize"`는 대부분의 마크업을 글자 그대로 그립니다.** 위생 처리에는 파싱할 DOM이 필요한데 서버에는 없습니다. `MawyViewer`도 서버에서는 같지만, 거기서는 다음 렌더에 엘리먼트가 도착합니다. 여기에는 다음 렌더가 없습니다. 예외는 브라우저가 읽는 방법이 하나뿐이라 파서가 필요 없는 몇 가지입니다. `<br>`, 따옴표로 감싼 `src`, `alt`, `width`, `height`, `title` 외에 다른 속성이 없는 `<img>`, 그리고 글을 감싸는 `<u>` 같은 태그입니다. [안전](../../guide/viewer#안전)을 보세요. `html="raw"`는 저자가 쓴 대로 마크업을 내보내고, [그것이 뜻하는 모든 것](../../guide/viewer#안전)이 따라옵니다.
- **하이라이터는 동기로 답할 때만 쓰입니다.** 프로미스가 도착할 두 번째 렌더가 없습니다. `mawyHighlighter`처럼 동기로 답하는 하이라이터를 넘기면 색이 HTML 안에 들어갑니다.
- **`data-mawy-range`가 어디에도 없습니다.** `MawyViewer`가 그린 엘리먼트는 모두 자기가 그려져 나온 위치를 지니고, 그것으로 화면의 한 지점을 문서의 위치로 되돌립니다. [원문 위치 추적](../../guide/viewer#원문-위치-추적)을 보세요. 이렇게 만든 페이지에서 그 물음을 던지는 것은 없고, 속성은 HTML의 4분의 1을 차지합니다. 이 저장소의 README가 16.8 kB 대신 12.2 kB, gzip으로는 4.6 kB 대신 3.4 kB로 나옵니다.

:::

::: fw flutter

- **툴바도 찾기 바도 개요도 없습니다.** 모두 컨트롤이고, 모두 이 위젯에 없는 스크롤 위치를 다룹니다. 필요하면 [`MawyViewer`](./mawy-viewer)를 쓰세요.
- **자기 선택 영역이 없습니다.** Flutter에서 글자는 `SelectableRegion` 안에서만 선택됩니다. 문서를 여럿 싣는 목록은 항목마다 하나가 아니라 목록 전체를 가로지르는 선택 하나를 원합니다. 그래서 선택이 닿을 범위는 애플리케이션이 정하고, 그 아래 링크는 그대로 따라갑니다. 공짜로 되는 일은 아니라서 뷰어도 같은 방식으로 읽습니다.
- **지연해서 만드는 것이 없습니다.** 열은 자식들의 높이를 합한 만큼이므로 문서가 길든 짧든 블록을 전부 만듭니다. 뷰어가 400블록부터 일부만 만드는 것과 다릅니다. 그 차이가 드러날 만큼 긴 문서라면 뷰어를 따로 두는 편이 맞습니다.
- **스크롤 컨트롤러도 `anchors`도 없습니다.** 둘 다 스크롤 위치에 대한 것이고, 여기서 스크롤은 문서를 담은 쪽의 것입니다. 각주 번호가 독자를 각주로 데려가고 다시 돌려보내는 것은 그 스크롤을 움직여서 합니다.

:::
