---
title: MawyViewer
order: 1
---

# `MawyViewer`

마크다운 문서를 그리고, 편집하지는 않습니다. 무엇을 왜 하는지는 [뷰어](../../guide/viewer)에 있습니다.

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

`children`과 `onChange`를 뺀 `<div>`의 모든 프롭을 받아 그대로 넘깁니다. `ref`는 가장 바깥 엘리먼트에 닿습니다.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

`package:flutter/widgets.dart`만으로 만들었습니다. Material도 Cupertino도 쓰지 않으므로, `MaterialApp` 안이든 `CupertinoApp` 안이든 맨 `WidgetsApp` 안이든 두 번째 디자인 시스템을 데려오지 않고 그대로 앉습니다.

:::

## 문서

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 마크다운 문서. 이것을 넘기면 문서의 주인은 애플리케이션이 됩니다. 스스로 바뀌지 않습니다. |
| `defaultValue` | `string` | `''` | 뷰어가 문서를 직접 가질 때, 시작할 문서. |
| `onValueChange` | `(value: string, file: File \| null) => void` | — | 새 문서와 그것이 온 파일. `value`를 넘겼든 아니든 호출됩니다. |
| `empty` | `ReactNode` | 파일 선택기 | 문서가 없을 때 대신 그릴 것. |

`value`도 `defaultValue`도 없으면 뷰어가 그대로 파일 선택기가 됩니다. 대비책이 아니라 이 컴포넌트의 설계 자체입니다.

:::

::: fw flutter

| 인자    | 타입     | 기본값 | 하는 일        |
| ------- | -------- | ------ | -------------- |
| `value` | `String` | 필수   | 마크다운 문서. |

React 패키지에서는 선택인 `value`가 여기서는 필수이고, 파일 선택기가 있었을 자리가 바로 그 자리입니다. 파일을 고르는 일은 플러그인을 뜻하는데, 이 패키지에는 없고 애플리케이션에는 대개 이미 있는 의존성입니다. 그래서 파일을 여는 것은 여러분의 몫이고 그리는 것이 Mawy의 몫입니다.

:::

## 읽기와 그리기

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `{ gfm: true, breaks: false, definitionLists: true }` | 마크다운을 어떻게 읽을지. |
| `html` | [`MawyHtmlPolicy`](../types/html-policy) | `'escape'` | 문서 안에 쓰인 날 HTML을 어떻게 할지. |
| `linkTarget` | [`MawyLinkTarget`](../types/link-target) | `'blank'` | 문서가 쓴 링크가 어디에서 열릴지. |
| `linkRel` | [`MawyLinkRel`](../types/link-target#mawylinkrel) | — | 그 링크가 가는 곳에 대해 무엇을 밝힐지. 이미 밝힌 것에 더합니다. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | 뷰어 인터페이스가 쓰는 언어. 문서와는 무관합니다. |
| `strings` | `Partial<`[`MawyStrings`](../types/locale#mawystrings)`>` | — | 인터페이스의 낱말 일부나 전부. 나머지는 `locale`에서 가져옵니다. |
| `highlight` | [`MawyHighlight`](../types/highlighter) | — | 펜스 코드 블록에 색을 입히는 것. 기본은 아무것도 하지 않습니다. |
| `directives` | [`MawyDirectives`](../types/directives) | — | 이 패키지가 모르는 구성물을 무엇으로 그릴지. |
| `image` | `ComponentType<`[`MawyImageProps`](../types/image)`>` | `<img>` | 문서가 가리키는 그림을 무엇으로 그릴지. |
| `resolveUrl` | [`MawyUrlResolver`](../types/url-resolver) | — | 문서의 상대 URL이 어디를 가리키는지. |
| `anchorPrefix` | `string` | — | 이 뷰어가 제목과 각주에 주는 앵커 앞에 붙일 것. 한 페이지에 뷰어가 둘일 때 이름이 부딪히지 않게 합니다. |
| `headingBase` | `number` | `1` | 문서의 `#`을 `h1`부터 `h6` 중 무엇으로 그릴지. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `MawyParseOptions()` | 마크다운을 어떻게 읽을지. |
| `locale` | [`MawyLocale`](../types/locale) | `MawyLocale.en` | 뷰어 인터페이스가 쓰는 언어. 문서와는 무관합니다. |
| `strings` | [`MawyStrings?`](../types/locale#mawystrings) | — | 애플리케이션이 직접 가진 인터페이스 낱말. 주면 `locale`은 쓰이지 않습니다. |
| `onLinkTap` | `void Function(String url, String? title)?` | — | 링크를 눌렀을 때 무엇을 할지. |
| `highlight` | [`MawyHighlighter?`](../types/highlighter) | — | 펜스 코드 블록에 색을 입히는 것. 기본은 아무것도 하지 않습니다. |
| `directives` | `Map<String, `[`MawyDirectiveBuilder`](../types/directives)`>?` | — | 이 패키지가 모르는 구성물을 무엇으로 그릴지. |
| `imageBuilder` | [`MawyImageBuilder?`](../types/image) | 뷰어가 직접 그림 | 문서가 가리키는 그림을 무엇으로 그릴지. |
| `resolveUrl` | [`MawyUrlResolver?`](../types/url-resolver) | — | 문서의 상대 URL이 어디를 가리키는지. |

`linkTarget`도 없습니다. 링크를 연다는 것이 무엇인지가 여기서는 `onLinkTap`이 답할 주제 전부이고, 어디에서 열릴지도 애플리케이션이 함께 답하는 것입니다.

`html` 인자는 없고 앞으로도 없습니다. 문서 안에 쓰인 날 HTML은 쓰인 글자 그대로 보입니다. 그것을 그릴 HTML이 Flutter에는 없기 때문입니다.

`onLinkTap`은 기본값이 없고, 주기 전까지 링크는 아무 일도 하지 않습니다. URL을 연다는 것은 그것을 플랫폼에 건넨다는 뜻이고, 어떤 URL까지 건넬지는 뷰어가 정할 일이 아닙니다. 호출될 시점에는 스킴 허용 목록이 이미 지나간 뒤라 `javascript:` URL은 여기까지 오지 않습니다. 나머지는 애플리케이션이 정합니다.

:::

## 겉모습

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme) | — | 팔레트. 애플리케이션이 주인일 때. |
| `defaultColorScheme` | `MawyColorScheme` | `'system'` | 시작할 팔레트. |
| `onColorSchemeChange` | `(scheme: MawyColorScheme) => void` | — | 바뀔 때마다 호출됩니다. 제어 여부와 무관하게. |
| `typography` | `Partial<`[`MawyTypography`](../types/typography)`>` | — | 문서 조판. 애플리케이션이 주인일 때. |
| `defaultTypography` | `Partial<MawyTypography>` | 아래 참고 | 처음 조판 값. |
| `onTypographyChange` | `(typography: MawyTypography) => void` | — | 바뀔 때마다 호출됩니다. 제어 여부와 무관하게. |
| `toolbar` | [`MawyViewerToolbarOption`](../types/viewer-toolbar-item) | `true` | 툴바에 둘 컨트롤과 그 순서. |
| `frame` | [`MawyFrame`](../types/frame) | `'box'` | 뷰어가 테두리를 두를지, 페이지 위에 뜰지. |
| `toolbarPlacement` | [`MawyToolbarPlacement`](../types/frame#mawytoolbarplacement) | `'top'` | 툴바와 찾기 바가 어느 끝에 있을지. |
| `fonts` | `readonly `[`MawyFont`](../types/font)`[]` | `MAWY_SYSTEM_FONTS` | 툴바가 제시할 글꼴과 나열 순서. |

`typography`와 `defaultTypography`에서 빠뜨린 항목은 기본값을 지키므로 `{ fontSize: 18 }` 하나로 답이 됩니다. 기본값은 `sans`, 16px, 줄 간격 1.7, 추가 자간 없음, `normal` 단 너비입니다.

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme) | `MawyColorScheme.system` | 팔레트. `system`은 플랫폼을 따릅니다. |
| `onColorSchemeChange` | `ValueChanged<MawyColorScheme>?` | — | 독자가 툴바에서 바꿀 때 호출됩니다. |
| `tokens` | [`MawyTokensBuilder?`](../theming) | 스타일시트의 값 | 뷰어가 정한 밝기에 맞춰 어떤 색으로 그릴지. |
| `typography` | [`MawyTypography?`](../types/typography) | — | 문서 조판. 애플리케이션이 주인일 때. |
| `defaultTypography` | `MawyTypography` | `MawyTypography()` | 뷰어가 직접 가질 때의 처음 조판 값. |
| `onTypographyChange` | `ValueChanged<MawyTypography>?` | — | `typography`를 넘겼든 아니든 호출됩니다. |
| `toolbar` | `List<`[`MawyViewerToolbarItem`](../types/viewer-toolbar-item)`>` | `kMawyViewerToolbar` | 그릴 컨트롤과 그 순서. 없애려면 `const []`. |
| `frame` | [`MawyFrame`](../types/frame) | `MawyFrame.box` | 뷰어가 테두리를 두를지, 화면 위에 뜰지. |
| `toolbarPlacement` | [`MawyToolbarPlacement`](../types/frame#mawytoolbarplacement) | `MawyToolbarPlacement.top` | 툴바와 찾기 바가 어느 끝에 있을지. |

색 팔레트는 조판처럼 제어 쌍을 이루지 않고 인자 하나입니다. `light`나 `dark`를 건네면 뷰어는 거기에 머물고, `system` 그대로 두면 플랫폼을 따릅니다. `onColorSchemeChange`는 독자가 툴바에서 고른 값을 알려 주므로, 그 선택을 기억하려는 애플리케이션은 기억한 값을 다시 넘기면 됩니다.

`MawyTypography`는 항목마다 기본값을 가진 클래스이지 선택 항목을 모아 둔 자루가 아닙니다. 그래서 `MawyTypography(fontSize: 18)` 하나로 답이 되고, 이미 있는 설정을 하나만 바꿀 때는 `copyWith`를 씁니다. 기본값은 `sans`, 논리 픽셀 16, 줄 간격 1.7, 추가 자간 없음, `normal` 단 너비입니다.

`fonts` 인자는 없습니다. 이 패키지는 글꼴을 싣지도 이름을 대지도 않으므로, 애플리케이션이 번들한 서체는 목록에서 고르는 대신 [`MawyTypography.fontFamilyName`](../types/typography)으로 이름을 댑니다.

:::

## 파일 열기

::: fw react

| 프롭       | 타입      | 기본값                           | 하는 일                           |
| ---------- | --------- | -------------------------------- | --------------------------------- |
| `fileDrop` | `boolean` | `value`를 넘기지 않았다면 `true` | 뷰어에 떨어뜨린 파일을 열지 말지. |
| `accept`   | `string`  | 모든 마크다운·텍스트 확장자      | 파일 선택기가 제시할 것.          |

5메가바이트를 넘는 파일은 읽지 않고 거절합니다.

:::

::: fw flutter

여기에는 없습니다. 이 패키지는 파일을 열지 않고, 그 이유는 위의 `value`에 있습니다.

:::

## 배치와 스크롤

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `padding` | `EdgeInsetsGeometry?` | React 패키지와 같은 수치 | 문서 둘레의 여백. |
| `scrollController` | `ScrollController?` | 자기 것 하나 | 문서의 스크롤러. 애플리케이션이 몰거나 지켜볼 수 있습니다. |
| `anchors` | [`MawyViewerAnchors?`](../types/viewer-anchors) | — | 문서의 최상위 블록이 각각 어디에 놓였는지. 그리면서 채웁니다. 다른 뷰를 이 문서에 맞춰 세우는 것들을 위한 것입니다. |

:::

::: fw react

여백과 스크롤은 컴포넌트가 아니라 페이지의 것입니다. 뷰어는 이미 둘을 가진 문서 안의 엘리먼트이기 때문입니다. 뷰어가 그릴 때 쓰는 수치는 `--mawy-*` 커스텀 속성이고, [테마](../theming)에 정리해 두었습니다.

:::
