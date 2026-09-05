---
title: API
order: 2
---

# API

패키지가 내보내는 모든 이름을 모아 둔 페이지입니다. 각 항목이 무엇이고 무엇을 받아 무엇을 돌려주는지 적었습니다.

:::: tip `1.0.0`

두 패키지 모두 `1.0.0`으로 게시되어 있습니다. 여기서부터 이 페이지의 이름은 유의적 버전을 따르므로, 이름이 사라지거나 모양이 바뀌는 변경은 메이저 버전에서만 일어납니다.

이 페이지의 내용은 메뉴 위 스위치가 가리키는 패키지에 모두 존재하고 실제로 동작합니다. 다른 쪽 패키지에만 있는 이름은 그 패키지를 고르기 전까지 나오지 않습니다.

::::

## 컴포넌트

### `MawyEditor`

뷰어를 옆에 둔 마크다운 에디터입니다. [에디터](../guide/editor)를 보세요.

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue="# 안녕하세요" onChange={save} />;
```

`children`과 `onChange`를 뺀 `<div>`의 모든 프롭을 받아 그대로 넘깁니다. `ref`는 가장 바깥 엘리먼트에 닿습니다.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyEditor(defaultValue: '# 안녕하세요', onChange: save);
```

뷰어와 마찬가지로 `package:flutter/widgets.dart`만으로 만들었고, 문서를 건네받지 않으면 직접 문서를 소유합니다.

:::

#### 문서

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 문서. 애플리케이션이 주인일 때. |
| `defaultValue` | `string` | `''` | 에디터가 문서를 직접 가질 때, 시작할 문서. |
| `onChange` | `(value: string) => void` | — | 모든 변경. 제어 여부와 무관하게. |
| `readOnly` | `boolean` | `false` | 읽고 선택하고 복사하는 것은 그대로 됩니다. |
| `placeholder` | `string` | 로케일에 맞는 안내문 | 문서가 비어 있는 동안 보입니다. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `String?` | — | 문서. 애플리케이션이 주인일 때. |
| `defaultValue` | `String` | `''` | 에디터가 문서를 직접 가질 때, 시작할 문서. |
| `onChange` | `ValueChanged<String>?` | — | 모든 변경. 직접 갖든 건네받든. |
| `readOnly` | `bool` | `false` | 읽고 선택하고 복사하는 것은 그대로 됩니다. |
| `placeholder` | `String?` | 로케일에 맞는 안내문 | 문서가 비어 있는 동안 보입니다. |

이 두 방식은 Flutter의 모든 텍스트 필드가 제공하는 방식이고, React 패키지가 제공하는 방식이기도 합니다.

:::

#### 화면

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `mode` | [`MawyMode`](#mawymode) | — | 어느 화면인지. 애플리케이션이 주인일 때. |
| `defaultMode` | `MawyMode` | `modes`의 첫 번째 | 시작할 화면. |
| `onModeChange` | `(mode: MawyMode) => void` | — | 바뀔 때마다 호출됩니다. |
| `modes` | `readonly MawyMode[]` | `['wysiwyg', 'plain', 'split', 'preview']` | 전환 컨트롤이 제시할 화면. 하나만 주면 컨트롤이 사라집니다. |

`'wysiwyg'`는 문서를 그리고 그 자리에서 편집합니다. 기본 목록의 첫 번째이고, 내놓고 싶지 않으면 `modes`에서 빼면 됩니다.

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `mode` | [`MawyEditorMode?`](#mawyeditormode) | — | 어느 화면인지. 애플리케이션이 주인일 때. |
| `defaultMode` | `MawyEditorMode` | `MawyEditorMode.split` | 처음 열 화면. |
| `onModeChange` | `ValueChanged<MawyEditorMode>?` | — | 읽는 사람이 다른 화면을 고르면 호출됩니다. |
| `modes` | `List<MawyEditorMode>` | [`kMawyEditorModes`](#kmawyeditormodes) | 전환 컨트롤이 제시할 화면. 하나만 주면 컨트롤이 사라집니다. |

**이 패키지의 화면은 셋이고**, React 패키지에 있는 `wysiwyg`가 빠져 있습니다. 그려진 자리에서 문서를 편집하는 기능은 `contenteditable`에 전적으로 의존합니다. 브라우저가 트리 변경 시도를 컴포넌트에 알리면, 컴포넌트가 그것을 거절하고 대신 마크다운을 고치는 구조입니다. `EditableText`가 문자열을 소유하는 Flutter에는 이런 구조가 없습니다. 텍스트 필드이면서 동시에 문서인 화면을 그리려면 문서 구조를 따로 들고 있는 두 번째 모델이 필요한데, 모델이 둘이면 조금이라도 특이한 문서에서 서로 다른 해석을 내놓습니다.

:::

#### 인터페이스

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `toolbar` | [`MawyEditorToolbarOption`](#mawyeditortoolbaroption) | `true` | 툴바에 어떤 컨트롤을 어떤 순서로 둘지. |
| `status` | [`MawyEditorStatusOption`](#mawyeditorstatusoption) | `true` | 상태 표시줄이 세는 것. |
| `lineNumbers` | `boolean` | `true` | 원문 왼쪽의 줄 번호 거터. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | 에디터 자신의 인터페이스가 쓰는 언어 — 툴바 레이블, 메뉴 항목, 상태 표시줄의 낱말, 스크린 리더에게 주는 문장. 미리보기에도 그대로 건네집니다. 문서와는 무관합니다. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `toolbar` | `List<MawyEditorToolbarItem>` | [`kMawyEditorToolbar`](#kmawyeditortoolbar) | 툴바에 어떤 컨트롤을 어떤 순서로 둘지. 없음은 `const []`. |
| `status` | `List<MawyEditorStatusItem>` | [`kMawyEditorStatus`](#kmawyeditorstatus) | 상태 표시줄이 세는 것. 없음은 `const []`. |
| `lineNumbers` | `bool` | `true` | 원문 화면 앞쪽 가장자리의 줄 번호 거터. |
| `locale` | [`MawyLocale`](#mawylocale) | `MawyLocale.en` | 에디터 자신의 인터페이스가 쓰는 언어 — 툴바 레이블, 메뉴 항목, 상태 표시줄의 낱말, 스크린 리더에게 주는 문장. 미리보기에도 그대로 건네집니다. 문서와는 무관합니다. |

뷰어의 [`toolbar`](#mawyviewer)와 같은 이유로, `true`가 아니라 리스트를 받습니다.

:::

#### 열기와 저장

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `onSave` | `(value: string, name: string) => void` | — | 저장한 문서가 가는 곳. 없으면 브라우저에 다운로드로 넘깁니다. |
| `accept` | `string` | 마크다운·텍스트 확장자 전부 | 파일 선택기가 제시할 것. |
| `fileDrop` | `boolean` | `false` | 에디터에 끌어다 놓은 마크다운 파일을 문서로 열지. |

이름은 파일을 열었다면 그 파일의 것이고, 아니면 문서의 첫 제목입니다. 에디터에 놓은 파일은 기본적으로 문서가 아니라 이미지입니다. 그 이유와 `fileDrop`으로 규칙을 끄는 법은 [열기와 저장](../guide/editor#열기와-저장)에 있습니다.

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `onOpen` | `VoidCallback?` | — | 문서를 연다는 것이 무슨 뜻인지. 없으면 `open` 버튼도, 에디터를 채우자고 권하는 빈 상태도 없습니다. |

**`onSave`도 `accept`도 `save`도 없습니다.** 파일 선택기는 위젯이 아니라 플러그인이고, 애플리케이션이 이미 어느 것을 골랐는지는 마크다운 에디터가 대신 정할 일이 아닙니다. 이음매는 `value`와 `onChange`가 전부입니다. 파일을 읽고, 문자열을 건네고, 문자열을 돌려받으면 됩니다.

`onOpen`은 파일 선택기가 아니라 버튼입니다. 에디터는 툴바와 빈 에디터의 판에 컨트롤을 그리고, 그 버튼을 눌렀을 때 무엇을 열지는 애플리케이션이 정합니다.

:::

#### 찾기

::: fw flutter

`Mod`+`F`가 원문 위에 찾기 바를 열고, [`MawyEditorToolbarItem.find`](#mawyeditortoolbaritem) 버튼도 같은 일을 합니다. `Enter`는 다음 일치, `Shift`+`Enter`는 이전 일치, `Escape`는 바를 닫고 포커스를 문서에 돌려줍니다.

플랫폼 자신의 찾기는 텍스트가 놓인 페이지에는 닿아도 텍스트 필드 *안*에는 닿지 않고, 원문 화면이 바로 그 텍스트 필드라서 이것이 있습니다. 계산 부분도 `findMatches`, `matchFrom`, `replaceMatch`, `replaceAll`, `MawyMatch`로 내보내 두었습니다. 자기 인터페이스에서 직접 몰고 싶은 애플리케이션을 위한 것입니다.

:::

::: fw react

`Mod`+`F`가 지금 보이는 화면 위에 찾기 바를 엽니다. [찾기](../guide/editor#찾기)를 보세요.

:::

#### 미리보기와 팔레트

::: fw react

`parse`, `html`, `fonts`, `directives`, `typography`, `defaultTypography`, `colorScheme`, `defaultColorScheme`, `onColorSchemeChange`는 [`MawyViewer`](#mawyviewer)에서와 정확히 같은 의미이고, 앞의 여섯은 미리보기로 그대로 전달됩니다. `directives`는 그려진 문서에도 닿습니다.

:::

::: fw flutter

`parse`, `directives`, `highlight`, `onLinkTap`, `typography`, `defaultTypography`, `colorScheme`, `onColorSchemeChange`, `tokens`는 [`MawyViewer`](#mawyviewer)에서와 정확히 같은 의미이고, 미리보기로 그대로 전달됩니다.

`tokens`는 미리보기 너머까지 닿습니다. 에디터 자신의 툴바와 상태 표시줄과 찾기 바가 모두 그것이 돌려준 팔레트로 그려지므로, 에디터와 그것이 편집하는 문서가 서로 다른 두 팔레트가 되는 일은 없습니다.

:::

### `MawyViewer`

마크다운 문서를 그리고, 편집하지는 않습니다. 무엇을 왜 하는지는 [뷰어](../guide/viewer)에 있습니다.

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

#### 문서

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

#### 읽기와 그리기

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `{ gfm: true, breaks: false, definitionLists: true }` | 마크다운을 어떻게 읽을지. |
| `html` | [`MawyHtmlPolicy`](#mawyhtmlpolicy) | `'escape'` | 문서 안에 쓰인 원본 HTML을 어떻게 할지. |
| `linkTarget` | `'blank' \| 'self'` | `'blank'` | 문서가 쓴 링크가 어디에서 열릴지. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | 뷰어 자신의 인터페이스가 쓰는 언어. 문서와는 무관합니다. |
| `directives` | [`MawyDirectives`](#mawydirectives) | — | 이 패키지가 모르는 구성을 무엇으로 그릴지. |

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `MawyParseOptions()` | 마크다운을 어떻게 읽을지. |
| `locale` | [`MawyLocale`](#mawylocale) | `MawyLocale.en` | 뷰어 자신의 인터페이스가 쓰는 언어. 문서와는 무관합니다. |
| `onLinkTap` | `void Function(String url, String? title)?` | — | 링크를 눌렀을 때 무엇을 할지. |
| `directives` | `Map<String, `[`MawyDirectiveBuilder`](#mawydirectivebuilder)`>?` | — | 이 패키지가 모르는 구성을 무엇으로 그릴지. |

`linkTarget`도 없습니다. 링크를 연다는 것이 무슨 뜻인지가 여기서는 `onLinkTap`의 주제 전부이고, 어디서 열지도 애플리케이션이 함께 답하는 것입니다.

`html` 인자는 없고, 생기지도 않을 것입니다. 문서 안에 쓰인 원본 HTML은 쓰인 글자 그대로 보입니다. 여기에는 그것을 그릴 HTML이라는 것이 없기 때문입니다.

`onLinkTap`은 기본값이 없고, 그것이 주어지기 전까지 링크는 아무 일도 하지 않습니다. URL을 여는 것은 그것을 플랫폼에 넘긴다는 뜻이고, 어떤 URL을 넘길 의향이 있는지는 뷰어가 대신 정할 문제가 아닙니다. 호출되는 시점에는 스킴 허용 목록이 이미 지나간 뒤라 `javascript:`는 여기까지 오지 않습니다. 그 나머지가 여러분의 몫입니다.

:::

#### 겉모습

::: fw react

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](#mawycolorscheme) | — | 팔레트. 애플리케이션이 주인일 때. |
| `defaultColorScheme` | `MawyColorScheme` | `'system'` | 시작할 팔레트. |
| `onColorSchemeChange` | `(scheme: MawyColorScheme) => void` | — | 바뀔 때마다 호출됩니다. 제어 여부와 무관하게. |
| `typography` | `Partial<`[`MawyTypography`](#mawytypography)`>` | — | 문서 조판. 애플리케이션이 주인일 때. |
| `defaultTypography` | `Partial<MawyTypography>` | 아래 참고 | 처음의 조판. |
| `onTypographyChange` | `(typography: MawyTypography) => void` | — | 바뀔 때마다 호출됩니다. 제어 여부와 무관하게. |
| `toolbar` | [`MawyViewerToolbarOption`](#mawyviewertoolbaroption) | `true` | 툴바에 어떤 컨트롤을 어떤 순서로 둘지. |
| `fonts` | `readonly `[`MawyFont`](#mawyfont)`[]` | `MAWY_SYSTEM_FONTS` | 툴바가 제시할 글꼴과 나열 순서. |

`typography`나 `defaultTypography`에서 빠뜨린 항목은 기본값을 지킵니다. `{ fontSize: 18 }`은 완전한 답입니다. 기본값은 고딕, 16px, 줄 간격 1.7, 자간 없음, `normal` 폭입니다.

:::

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](#mawycolorscheme)`?` | — | 팔레트. 애플리케이션이 주인일 때. |
| `defaultColorScheme` | [`MawyColorScheme`](#mawycolorscheme) | `MawyColorScheme.system` | 에디터가 직접 가질 때, 시작할 팔레트. |
| `onColorSchemeChange` | `ValueChanged<MawyColorScheme>?` | — | 독자가 툴바에서 바꿨을 때 호출됩니다. |
| `tokens` | [`MawyTokensBuilder`](#mawytokens)`?` | 스타일시트의 값 | 그릴 색. 뷰어가 정한 밝기를 받아 돌려줍니다. |
| `typography` | [`MawyTypography`](#mawytypography)`?` | — | 문서 조판. 애플리케이션이 주인일 때. |
| `defaultTypography` | `MawyTypography` | `MawyTypography()` | 뷰어가 직접 가질 때, 처음의 조판. |
| `onTypographyChange` | `ValueChanged<MawyTypography>?` | — | `typography`를 넘겼든 아니든 호출됩니다. |
| `toolbar` | `List<`[`MawyViewerToolbarItem`](#mawyviewertoolbaritem)`>` | [`kMawyViewerToolbar`](#kmawyviewertoolbar) | 그릴 컨트롤과 그리는 순서. 없애려면 `const []`. |

`MawyTypography`는 선택 항목의 묶음이 아니라 모든 항목에 기본값이 있는 클래스입니다. 그래서 `MawyTypography(fontSize: 18)`이 완전한 답이고, 이미 있는 설정에서 하나만 바꾸는 것은 `copyWith`입니다. 기본값은 고딕, 논리 픽셀 16, 줄 간격 1.7, 자간 없음, `normal` 폭입니다.

`fonts` 인자는 없습니다. 이 패키지는 글꼴을 싣지도 이름 대지도 않으므로, 애플리케이션이 번들한 서체는 목록으로 제시되는 대신 [`MawyTypography.fontFamilyName`](#mawytypography)으로 이름을 댑니다.

:::

#### 파일 열기

::: fw react

| 프롭       | 타입      | 기본값                           | 하는 일                       |
| ---------- | --------- | -------------------------------- | ----------------------------- |
| `fileDrop` | `boolean` | `value`를 넘기지 않았으면 `true` | 뷰어에 놓은 파일을 열지 여부. |
| `accept`   | `string`  | 마크다운·텍스트 확장자 전부      | 파일 선택기가 제시할 것.      |

5메가바이트가 넘는 파일은 읽지 않고 거절합니다.

:::

::: fw flutter

여기에는 아무것도 없습니다. 이 패키지는 파일을 열지 않고, 그 이유는 위의 `value`에 적혀 있습니다.

:::

#### 배치와 스크롤

::: fw flutter

| 인자 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `padding` | `EdgeInsetsGeometry?` | React 패키지의 값 그대로 | 문서 둘레의 여백. |
| `scrollController` | `ScrollController?` | 자기 것 하나 | 문서의 스크롤러. 애플리케이션이 몰거나 지켜볼 수 있습니다. |
| `anchors` | `MawyViewerAnchors?` | — | 문서의 최상위 블록 각각이 어디에 놓였는지. 그리면서 채워집니다. 다른 화면을 이 화면에 맞춰 세우려는 쪽을 위한 것입니다. |

:::

::: fw react

여백과 스크롤은 컴포넌트가 아니라 페이지의 것입니다. 뷰어는 그 둘을 이미 가진 문서 안의 엘리먼트이기 때문입니다. 뷰어가 쓰는 값은 `--mawy-*` 커스텀 속성이고, 아래 스타일시트 절이 그 목록입니다.

:::

## 타입

::: fw react

`mawy-react`와 `mawy-react/types` 양쪽에서 내보냅니다. 두 번째 진입점은 애플리케이션이 컴포넌트를 가져오지 않고도 자기 프롭에 이 타입을 쓸 수 있게 하려고 둔 것입니다.

:::

::: fw flutter

`package:mawy/mawy.dart`에서 내보냅니다. 그것이 이 패키지의 공개 표면 전부입니다. import는 하나뿐이고, 그 밖에 손댈 곳이 없습니다.

:::

::: fw react

### `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview' | 'split';
```

문서를 어느 화면에서 보여줄지 정합니다. 네 화면 모두 같은 문서를 보여줍니다. [에디터](../guide/editor)를 보세요.

- `'wysiwyg'` — 그려진 문서를 그 자리에서 편집.
- `'plain'` — 마크다운 원문을 텍스트로 편집.
- `'preview'` — 그려진 문서, 읽기 전용.
- `'split'` — 한쪽에 원문, 다른 쪽에 미리보기를 동시에.

`split`이 이 목록 옆이 아니라 안에 있는 것은 독자가 그 컨트롤로 하는 일 때문입니다. 넷은 한 번에 하나씩 고르는 버튼 묶음 하나이고, "둘 다"는 같은 질문에 대한 네 번째 답입니다.

:::

::: fw flutter

### `MawyEditorMode`

```dart
enum MawyEditorMode { plain, split, preview }
```

문서를 어느 화면에서 보여줄지 정합니다. 세 화면 모두 같은 문서를 보여줍니다. [에디터](../guide/editor)를 보세요.

- `plain` — 색이 입혀진 마크다운 원문을 텍스트로 편집.
- `split` — 한쪽에 원문, 다른 쪽에 그려진 문서를 동시에. 기본값입니다.
- `preview` — 그려진 문서만.

`wysiwyg`는 없고, 앞으로도 두지 않습니다. 이유는 위 [`MawyEditor`](#mawyeditor)에 있습니다.

:::

::: fw flutter

### `kMawyEditorModes`

```dart
const List<MawyEditorMode> kMawyEditorModes;
```

전환 컨트롤이 제시하는 순서대로 셋 전부이고, `modes`의 기본값입니다. 하나만 주면 컨트롤이 사라집니다.

:::

### `MawyEditorToolbarItem`

::: fw react

```ts
type MawyEditorToolbarItem =
  | 'mode'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule'
  | 'find'
  | 'open'
  | 'save'
  | 'colorScheme'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyEditorToolbarItem {
  mode,
  bold,
  italic,
  strikethrough,
  code,
  link,
  image,
  heading,
  quote,
  bulletList,
  orderedList,
  taskList,
  codeBlock,
  rule,
  find,
  colorScheme,
  separator,
}
```

:::

에디터 툴바의 컨트롤 하나입니다. `mode`·`find`·`colorScheme`·`separator`를 뺀 나머지는 모두 서식 명령이고, 전부 키보드 단축키를 함께 갖습니다. `find`에도 `Mod`+`F`가 있으며, 버튼을 그리든 그리지 않든 동작합니다.

::: fw react

`open`과 `save`도 여기에 있습니다. `Mod`+`S`는 버튼이 그려지든 아니든 저장하고, `open`에는 단축키가 없습니다. 브라우저 자신의 `Mod`+`O`는 그냥 두는 편이 합당하고, 파일을 여는 것은 흐름 중간에 하는 일이 아니라 드물고 분명한 행동이기 때문입니다.

:::

::: fw flutter

`open`과 `save`가 없습니다. 이 패키지에서 그 둘은 애플리케이션이 맡습니다. [열기와 저장](../guide/editor#열기와-저장)을 보세요.

:::

::: fw react

### `MawyEditorToolbarOption`

```ts
type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];
```

`true`는 위 순서대로 전부이고, `false`는 툴바 없음이며, 배열을 주면 정확히 그 컨트롤을 그 순서대로 그립니다.

:::

::: fw flutter

### `kMawyEditorToolbar`

```dart
const List<MawyEditorToolbarItem> kMawyEditorToolbar;
```

툴바가 그리는 순서대로의 모든 컨트롤이며, `toolbar`의 기본값입니다. `const []`는 툴바 없음이고, 그 밖의 리스트는 정확히 그 컨트롤들을 정확히 그 순서로 뜻합니다.

:::

### `MawyEditorStatusItem`

::: fw react

```ts
type MawyEditorStatusItem = 'position' | 'selection' | 'lines' | 'words' | 'characters' | 'size';
```

:::

::: fw flutter

```dart
enum MawyEditorStatusItem { position, selection, lines, words, characters, size }
```

:::

에디터가 아래쪽에서 세어 보여주는 값입니다. `characters`는 코드 포인트라서 이모지 하나는 하나로 셉니다. `words`는 공백으로 나눈 수에 한자·히라가나·가타카나 글자를 각각 더합니다. 그 언어들은 공백 없이 쓰이기 때문이고, 한국어는 띄어 쓰므로 어절 하나가 한 단어입니다. `size`는 UTF-8 바이트이고, 그것이 디스크에 저장될 크기입니다.

::: fw react

### `MawyEditorStatusOption`

```ts
type MawyEditorStatusOption = boolean | readonly MawyEditorStatusItem[];
```

`true`는 위 목록 전부이고, `false`는 상태 표시줄 없음이며, 배열을 주면 정확히 그 항목을 그 순서대로 보여줍니다.

:::

::: fw flutter

### `kMawyEditorStatus`

```dart
const List<MawyEditorStatusItem> kMawyEditorStatus;
```

따로 말하지 않으면 상태 표시줄이 세는 항목입니다. `const []`는 상태 표시줄 없음입니다.

:::

### `MawyColorScheme`

::: fw react

```ts
type MawyColorScheme = 'light' | 'dark' | 'system';
```

:::

::: fw flutter

```dart
enum MawyColorScheme { light, dark, system }
```

:::

어느 팔레트로 그릴지 정합니다. 기본값 `system`은 플랫폼 설정을 따릅니다. 브라우저에서는 `prefers-color-scheme`, 앱에서는 `MediaQuery.platformBrightnessOf`를 읽습니다. 이미 어두운 화면 안에 놓인 뷰어만 밝게 남는 것을 막기 위해서입니다. `light`과 `dark`는 플랫폼 설정을 따르지 않으므로, 자체 스위치가 있는 애플리케이션이 그 값으로 뷰어를 제어할 수 있습니다.

### `MawyLocale`

::: fw react

```ts
type MawyLocale = 'en' | 'ko';
```

:::

::: fw flutter

```dart
enum MawyLocale { en, ko }
```

:::

**영어와 한국어**를 지원하고 기본값은 `en`입니다. 뷰어와 에디터가 직접 쓰는 텍스트, 곧 툴바 레이블과 메뉴 항목, 스크린 리더에게 주는 문장의 언어이며, 문서가 쓰인 언어와는 무관합니다. 두 패키지가 같은 이름으로 같은 문장을 싣고, 한쪽에만 있는 언어는 지원 언어로 보지 않습니다.

### `MawyParseOptions`

::: fw react

```ts
interface MawyParseOptions {
  gfm?: boolean; // 기본값: true
  breaks?: boolean; // 기본값: false
  definitionLists?: boolean; // 기본값: true
}
```

:::

::: fw flutter

```dart
class MawyParseOptions {
  const MawyParseOptions({
    this.gfm = true,
    this.breaks = false,
    this.definitionLists = true,
  });
}
```

:::

- **`gfm`** — GitHub Flavored Markdown: 표, 체크박스 목록, `~~취소선~~`, 알림 블록, 각주, 그리고 맨 URL이 링크가 되는 것.
- **`breaks`** — 문단 안의 줄바꿈 하나를 줄바꿈으로 볼지 정합니다. CommonMark 명세를 따라 기본은 꺼짐입니다. 켜면 채팅 클라이언트와 이슈 트래커처럼 동작하며, 마크다운을 써 본 적 없는 독자는 이쪽을 기대합니다.
- **`definitionLists`** — 글줄 아래에서 `: `로 시작하는 줄을 용어와 그 뜻으로 볼지 정합니다. 기본은 켜짐이며, Mawy가 읽고 GitHub은 읽지 않는 유일한 문법입니다. PHP Markdown Extra의 문법을 그대로 따랐습니다. GitHub에서와 정확히 같게 읽혀야 하는 문서라면 끄세요.

세 옵션은 두 패키지에서 이름도 기본값도 효과도 같습니다. 파서가 하나이고, [CI의 검사](https://github.com/jooy2/mawy/blob/main/packages/flutter/tool/parity.dart)가 저장소의 모든 마크다운 파일에 대해 두 트리를 diff합니다.

::: fw react

### `MawyHtmlPolicy`

```ts
type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';
```

문서 안에 쓰인 원본 HTML을 어떻게 할지.

- `'escape'` — 쓰인 글자 그대로 보여줍니다. 기본값이며, 조건 없이 안전한 유일한 값입니다.
- `'sanitize'` — 허용 목록 밖의 요소·속성·URL 스킴을 먼저 제거한 뒤 그립니다.
- `'raw'` — 쓰인 그대로 그립니다. 아무것도 제거하지 않고 검사하지도 않습니다. 문서 안의 `<script>`가 실행되고, 이미지의 `onerror`가 실행되며, `<iframe>`이 로드됩니다. 전부 그 페이지의 출처에서 그 페이지의 쿠키를 가지고 실행됩니다. **문서에 글자를 넣을 수 있는 사람은 애플리케이션이 할 수 있는 일을 전부 할 수 있습니다.** 애플리케이션이 직접 쓴 문서나 이미 안전하게 만들어 둔 문서에만 켜세요.

셋 중 어느 값도 링크에는 영향을 주지 않습니다. `[click](javascript:…)`은 모든 값에서 거절됩니다. 이 표기는 HTML이 아니라 마크다운이고, `html` 옵션은 HTML만 다루기 때문입니다.

:::

### `MawyTypography`

::: fw react

```ts
interface MawyTypography {
  fontFamily: MawyFontFamily; // 기본값: 'sans'
  fontSize: number; // px, 13–26. 기본값: 16
  lineHeight: number; // 단위 없음, 1.3–2.4. 기본값: 1.7
  letterSpacing: number; // em, −0.04–0.16. 기본값: 0
  measure: MawyMeasure; // 기본값: 'normal'
}
```

문서를 어떻게 조판할지 정합니다. 모든 항목이 `--mawy-doc-*` 커스텀 속성으로 화면에 전달되므로, 범위를 벗어난 값을 넣어도 문서가 깨지지 않고 보기에만 어색해집니다.

:::

::: fw flutter

```dart
class MawyTypography {
  const MawyTypography({
    this.fontFamily = MawyFontFamily.sans,
    this.fontFamilyName, // 플랫폼의 것 대신 쓸, 번들한 패밀리 이름
    this.fontSize = 16, // 논리 픽셀
    this.lineHeight = 1.7, // 단위 없음
    this.letterSpacing = 0, // em
    this.measure = MawyMeasure.normal,
  });

  MawyTypography copyWith({ /* 모든 항목, 전부 선택 */ });
}
```

문서를 어떻게 조판할지 정합니다. 모든 항목에 기본값이 있어서 `MawyTypography(fontSize: 18)`처럼 하나만 지정해도 되고, 나머지는 기본값을 유지합니다. 이미 있는 설정에서 하나만 바꿀 때는 `copyWith`를 씁니다.

늘어난 항목은 `fontFamilyName` 하나이며, React 패키지의 `fonts` 목록을 대신합니다. 이 패키지는 글꼴을 싣지 않습니다. 세 역할은 각각 플랫폼의 기본 패밀리로 이어지고, 특정 서체를 쓰려면 애플리케이션이 그 서체를 번들한 뒤 여기에 이름을 넘깁니다.

:::

### `MawyFontFamily`

::: fw react

```ts
type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});
```

뷰어가 받은 글꼴 중 하나의 `id`입니다. `sans`·`serif`·`mono`는 라이브러리가 기본으로 제공하는 셋이며, 특정 글꼴 이름이 아니라 역할입니다. 내려받는 파일이 없고, 각 역할 뒤의 스택은 애플리케이션이 다시 선언할 수 있는 `--mawy-font-*` 커스텀 속성입니다. 그 밖의 문자열은 `fonts`로 넘긴 글꼴의 `id`입니다.

:::

::: fw flutter

```dart
enum MawyFontFamily { sans, serif, mono }
```

세 역할이 전부입니다. 특정 글꼴 이름이 아니라 역할이라서 각각 플랫폼의 기본 패밀리로 이어지고, 특정 서체를 쓰려면 애플리케이션이 그 서체를 번들한 뒤 [`MawyTypography.fontFamilyName`](#mawytypography)으로 이름을 넘깁니다. 네 번째 값은 없습니다. 값을 더할 글꼴 목록 자체가 없기 때문입니다.

:::

::: fw react

### `MawyFont`

```ts
interface MawyFont {
  id: string;
  label?: string;
  stack?: string;
  href?: string;
}
```

툴바가 제시하는 글꼴 하나이며, 아래 두 목록이 그대로 넘길 수 있는 값입니다. 글꼴을 처음 그리는 순간에 스타일시트를 받아오는 동작은 브라우저에서만 가능하므로, 이 값은 이름 하나가 아니라 목록입니다.

- **`id`** — 이 글꼴을 고르기 위해 `typography.fontFamily`에 넣는 값.
- **`label`** — 툴바에 보이는 이름. 빼면 `sans`·`serif`·`mono`는 로케일에서, 그 밖에는 `id`에서 가져옵니다.
- **`stack`** — CSS `font-family` 값. 기본값은 `var(--mawy-font-{id})`.
- **`href`** — 글꼴을 그리기 전에 도착해야 하는 스타일시트. 글꼴을 처음 그릴 때 또는 글꼴 메뉴에 이름이 처음 보일 때, 페이지당 한 번 받아옵니다.

:::

::: fw react

### `MAWY_SYSTEM_FONTS`

```ts
const MAWY_SYSTEM_FONTS: readonly MawyFont[];
```

독자의 기기에 이미 있는 것으로 그리는 세 역할. `href`가 없으므로 기본 상태의 뷰어는 아무것도 받아오지 않습니다.

:::

::: fw react

### `MAWY_WEB_FONTS`

```ts
const MAWY_WEB_FONTS: readonly MawyFont[];
```

바로 쓸 수 있는 열세 개의 오픈 라이선스 글꼴. 전부 SIL Open Font License이며 상업적 사용·임베딩·재배포가 허용됩니다. Inter, IBM Plex Sans, Atkinson Hyperlegible, Source Serif 4, Literata, Lora, EB Garamond, JetBrains Mono, 그리고 한글 다섯: Pretendard, Noto Sans KR, Noto Serif KR, 나눔명조, 고운돋움.

**애플리케이션이 직접 넘기지 않으면 쓰이지 않습니다.** 다른 사람의 페이지 안에 들어간 컴포넌트가 그 페이지가 고르지 않은 폰트 CDN에 연결을 열 이유는 없습니다. 그래서 기본값으로 두지 않고 export로 제공합니다.

```tsx
<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
```

:::

### `MawyDirectiveKind`

::: fw react

```ts
type MawyDirectiveKind = 'container' | 'leaf' | 'text';
```

:::

::: fw flutter

```dart
enum MawyDirectiveKind { container, leaf, text }
```

:::

디렉티브가 세 모양 중 어느 것으로 쓰였는지 나타냅니다. 콜론의 개수만 다릅니다. `:::container`는 블록을 담고, `::leaf`는 한 줄이며, `:text`는 문장 안에 들어갑니다. 용도는 [디렉티브](../guide/viewer#디렉티브)에 있습니다.

::: fw react

### `MawyDirectives`

```ts
type MawyDirectives = Readonly<Record<string, React.ComponentType<MawyDirectiveProps>>>;
```

애플리케이션이 처리할 디렉티브를 이름별로 등록하는 표입니다. 목록에 없는 이름은 쓰인 글자 그대로 그립니다. 기본 `html` 정책에서 원시 HTML을 다루는 방식과 같습니다.

:::

::: fw react

### `MawyDirectiveProps`

```ts
interface MawyDirectiveProps {
  name: string;
  kind: MawyDirectiveKind;
  attributes: Readonly<Record<string, string>>;
  /** 그려진 `[label]`. 문서가 쓰지 않았으면 `null`. */
  label: React.ReactNode;
  /** 컨테이너의 블록들, 그려진 것. 나머지 두 모양에서는 `null`. */
  children: React.ReactNode;
  range: MawyRange;
  /** 쓰인 글자 그대로. */
  source: string;
}
```

디렉티브의 컴포넌트가 받는 값입니다. 안쪽 조각은 **이미 그려진 채로** 도착합니다. 그래서 컴포넌트는 React 엘리먼트를 조립하기만 하고, 마크다운을 다시 파싱하거나 마크업 문자열을 다루지 않습니다.

`attributes`는 `{…}`에 쓰인 것을 쓰인 순서대로 담습니다. `{#id}`는 `id`로, `{.a .b}`는 `class`로 도착하고, 맨 이름은 빈 문자열로 도착합니다. 그것이 플래그를 적는 방법입니다. 모든 값이 문자열인 것은 문서가 말한 것이 문자열뿐이기 때문입니다.

:::

::: fw flutter

### `MawyDirective`

```dart
class MawyDirective {
  final String name;
  final MawyDirectiveKind kind;
  final Map<String, String> attributes;
  final InlineSpan? label; // 그려진 `[label]`. 문서가 쓰지 않았으면 `null`
  final List<Widget>? children; // 컨테이너의 블록들. 나머지 두 모양에서는 `null`
  final MdRange range;
  final String source; // 쓰인 글자 그대로
}
```

디렉티브의 빌더가 받는 값입니다. 안쪽 조각은 **이미 그려진 채로** 도착합니다. 그래서 빌더는 위젯을 조립하기만 하고, 마크다운을 다시 파싱하지 않습니다.

`attributes`는 `{…}`에 쓰인 것을 쓰인 순서대로 담습니다. `{#id}`는 `id`로, `{.a .b}`는 `class`로 도착하고, 맨 이름은 빈 문자열로 도착합니다. 그것이 플래그를 적는 방법입니다. 모든 값이 `String`인 것은 문서가 말한 것이 문자열뿐이기 때문입니다.

:::

::: fw flutter

### `MawyDirectiveBuilder`

```dart
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);
```

디렉티브 하나를 그리는 함수입니다. `MawyDirectiveKind.text`는 문장 안에 `WidgetSpan`으로 놓이므로, 인라인 디렉티브의 빌더는 글줄 높이에 맞는 위젯을 돌려주어야 합니다. 대개 `Text.rich`를 씁니다.

:::

::: fw react

### `MawyRange`

```ts
interface MawyRange {
  start: number;
  end: number;
}
```

문서의 한 조각이 원문 어디에 쓰였는지를 위치값으로 알려 줍니다. 모든 엘리먼트가 `data-mawy-range`로 들고 있는 두 수를, 컴포넌트에는 숫자 그대로 건넵니다. 현재 이 값을 받는 곳은 [`MawyDirectiveProps`](#mawydirectiveprops) 하나뿐입니다.

:::

### `MawyMeasure`

::: fw react

```ts
type MawyMeasure = 'narrow' | 'normal' | 'wide' | 'full';
```

:::

::: fw flutter

```dart
enum MawyMeasure { narrow, normal, wide, full }

extension MawyMeasureWidth on MawyMeasure {
  double? get width; // 560, 704, 880, null
}
```

:::

본문의 최대 폭입니다. 34rem, 44rem, 56rem, 또는 제한 없음 중에서 고릅니다. Flutter에서는 논리 픽셀 560·704·880이며, 본문 16픽셀 기준으로 같은 세 폭입니다. 글자를 키우면 한 줄이 지나치게 길어지므로, 툴바에서 글자 크기 옆에 두었습니다. `full`은 이미 폭이 정해진 자리에 놓인 뷰어를 위한 값입니다.

### `MawyViewerToolbarItem`

::: fw react

```ts
type MawyViewerToolbarItem =
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'measure'
  | 'colorScheme'
  | 'outline'
  | 'find'
  | 'copy'
  | 'open'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyViewerToolbarItem {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  measure,
  colorScheme,
  outline,
  find,
  copy,
  separator,
}
```

:::

뷰어 툴바의 컨트롤 하나입니다. `separator`만은 컨트롤이 아니라 가는 구분선을 그립니다.

`find`는 문서 위에 찾기 바를 열고, 뷰어에 포커스가 있는 동안 `Ctrl`+`F`(`Cmd`+`F`)를 가져갑니다. 빼면 단축키는 다시 브라우저의 것이 되고, 페이지 전체를 채우는 뷰어라면 그편이 맞습니다. 이 컨트롤은 자기 영역 안에 들어앉은 뷰어를 위한 것이고, 그런 뷰어는 브라우저의 찾기가 안으로 들어오지 않고 지나쳐 갑니다. 찾는 대상은 문서가 _그리는_ 글자입니다. `**bold**` 안의 `bold`는 찾을 수 있고 `**`로는 아무것도 찾을 수 없습니다. 한 일치가 두 런에 걸칠 수는 없어서 `he**llo**`에서 `hello`도 찾을 수 없고, 코드 블록은 검색하지 않습니다.

::: fw flutter

`open`은 없습니다. 파일 선택기가 없는 것과 같은 이유입니다. 파일을 여는 일은 이 패키지에 없는 플러그인을 뜻합니다.

:::

::: fw react

### `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true`는 위 순서대로 전부이고, `false`는 툴바 없음이며, 배열을 주면 정확히 그 컨트롤을 그 순서대로 그립니다.

목록에 없는 컨트롤을 추가하는 방법은 두 패키지 모두 제공하지 않습니다. 임의의 자식을 받는 툴바는 라이브러리가 키보드 조작을 보장할 수 없습니다.

:::

::: fw flutter

### `kMawyViewerToolbar`

```dart
const List<MawyViewerToolbarItem> kMawyViewerToolbar;
```

툴바가 그리는 순서대로의 모든 컨트롤이며, `toolbar`의 기본값입니다. `const []`는 툴바 없음이고, 그 밖의 리스트는 정확히 그 컨트롤들을 정확히 그 순서로 뜻합니다.

:::

::: fw react

## 스타일시트

### `mawy-react/styles.css`

완성된 스타일시트이며, 애플리케이션이 한 번 가져오면 됩니다. 라이브러리가 그리는 모든 값이 `--mawy-*` 커스텀 속성이고, 테마는 이 네임스페이스만 다루면 됩니다.

토큰은 `:root`가 아니라 **`.mawy-root`** 에 선언합니다. 컴포넌트 라이브러리가 문서 루트에 값을 쓸 이유가 없고, `:root`에서 팔레트를 읽으면 밝은 페이지 안에 어두운 뷰어를 넣을 수 없기 때문입니다. 토큰은 상속되므로 감싸는 엘리먼트 하나에 선언하면 그 안의 모든 Mawy 화면에 적용됩니다.

| 묶음 | 토큰 |
| --- | --- |
| 서체 | `--mawy-font-sans`, `--mawy-font-serif`, `--mawy-font-mono` |
| 문서 | `--mawy-doc-font`, `--mawy-doc-size`, `--mawy-doc-line-height`, `--mawy-doc-letter-spacing`, `--mawy-doc-measure` |
| 면 | `--mawy-bg`, `--mawy-bg-sunken`, `--mawy-bg-raised`, `--mawy-chrome` |
| 글자 | `--mawy-fg`, `--mawy-fg-muted`, `--mawy-fg-subtle` |
| 선 | `--mawy-border`, `--mawy-border-strong` |
| 강조색 | `--mawy-accent`, `--mawy-accent-hover`, `--mawy-accent-fg`, `--mawy-accent-soft` |
| 코드 | `--mawy-code-bg`, `--mawy-code-fg`, `--mawy-mark-bg`, `--mawy-mark-fg` |
| 찾기 | `--mawy-find`, `--mawy-find-current` |
| 알림 | `--mawy-note`, `--mawy-tip`, `--mawy-important`, `--mawy-warning`, `--mawy-caution` |
| 모양과 움직임 | `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-shadow-1`, `--mawy-shadow-2`, `--mawy-duration`, `--mawy-easing` |

문서를 그리는 데 쓰는 클래스 이름 `.mawy-md-*`도 공개된 확장 지점입니다. 라이브러리가 렌더 프롭을 내주지 않아도 애플리케이션이 표나 코드 블록의 스타일을 바꿀 수 있습니다.

:::

::: fw flutter

## 팔레트

### `MawyTokens`

```dart
class MawyTokens {
  static const MawyTokens light;
  static const MawyTokens dark;
  static MawyTokens of(Brightness brightness);
  MawyTokens copyWith({Brightness? brightness, Color? background, /* … */});
}

typedef MawyTokensBuilder = MawyTokens Function(Brightness brightness);
```

문서와 그 인터페이스를 그리는 모든 색을 한 객체에 담았습니다. 항목은 React 패키지의 `--mawy-*` 커스텀 속성을 Dart식 이름으로 옮긴 것입니다. `background`, `backgroundSunken`, `backgroundRaised`, `chrome`, `foreground`, `foregroundMuted`, `foregroundSubtle`, `border`, `borderStrong`, `accent`, `accentHover`, `accentForeground`, `accentSoft`, `find`, `findCurrent`, `codeBackground`, `codeForeground`, `markBackground`, `markForeground`, 그리고 알림 종류마다 하나씩 있습니다. 값도 스타일시트의 값을 그대로 옮겼으므로, 브라우저에서 `#5b34ea`인 색은 앱에서도 `#5b34ea`입니다.

뷰어는 전역 설정을 읽지 않고 자기 `colorScheme`에서 `light`이나 `dark`를 고릅니다. 그래서 밝은 화면 안에서 문서 하나만 어둡게 할 수 있습니다.

자기 색을 쓰려는 애플리케이션은 `tokens`를 넘깁니다. 팔레트 하나가 아니라 `MawyTokensBuilder`를 받는데, 뷰어가 나머지 인자를 다 받은 다음에야 자기 밝기를 정하기 때문입니다. 플랫폼을 따라가는 문서라면 두 팔레트 모두에 값을 준비해 두어야 합니다. 팔레트는 `copyWith`로 만듭니다. 색 하나를 바꾸려고 서른한 개를 다시 쓰지 않고, `MawyTokens.of(brightness)`에서 출발해 바꿀 값만 지정합니다.

```dart
MawyViewer(
  value: document,
  tokens: (Brightness brightness) =>
      MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
);
```

이 export는 문서 옆에 자기 인터페이스를 그리면서 같은 색을 쓰고 싶은 애플리케이션을 위한 것이기도 합니다.

### `MawyRadius`와 `MawyMotion`

```dart
abstract final class MawyRadius {
  static const double small = 6; // 코드 조각, 칩
  static const double medium = 9; // 버튼, 입력란
  static const double large = 14; // 카드, 메뉴, 코드 블록
}

abstract final class MawyMotion {
  static const Duration duration = Duration(milliseconds: 140);
  static const Cubic easing = Cubic(0.2, 0, 0.2, 1);
}
```

모서리 반경과, 움직이는 모든 요소가 공유하는 지속 시간 하나와 곡선 하나입니다. 반경은 연속된 눈금이 아니라 세 크기뿐입니다. [`MawyTokens`](#mawytokens)이 색을 옮긴 것처럼, React 패키지의 `--mawy-radius-*`, `--mawy-duration`, `--mawy-easing`을 값 그대로 옮겼습니다.

:::

## 파서

::: fw react

`mawy-react/markdown`은 별도의 진입점입니다. 목차로 쓸 개요나 각주, 제목에 붙은 앵커만 필요한 애플리케이션이 컴포넌트까지 함께 설치할 필요는 없으므로, 여기에는 컴포넌트를 두지 않았습니다. React도 DOM도 필요 없어서 빌드 스크립트와 서버에서도 그대로 쓸 수 있습니다.

```ts
import { parseMarkdown, slugify } from 'mawy-react/markdown';

const { outline, footnotes } = parseMarkdown(document);
```

### `parseMarkdown`

```ts
function parseMarkdown(source: string, options?: MarkdownOptions): MdDocument;
```

`source`를 마크다운으로 읽습니다. 뷰어와 같은 호출에 같은 옵션을 쓰므로, 여기서 파싱한 문서와 뷰어가 그린 문서는 같은 트리입니다.

### `MdDocument`

```ts
interface MdDocument {
  root: MdRoot; // 블록들
  outline: MdOutlineEntry[]; // 모든 제목이 순서대로, 각각 고유한 슬러그와 함께
  footnotes: MdFootnoteDefinition[]; // 누군가 가리킨 것만, 가리킨 순서대로
}
```

파싱된 문서입니다. 트리와 개요, 그리고 각주가 들어 있습니다. 각주는 `root`에 없습니다. 작성자는 편한 곳에 쓰고 독자는 맨 아래에서 읽으므로, 문서를 그리는 쪽이 본문 다음에 그립니다.

노드 타입도 함께 내보냅니다. `MdHeading`, `MdParagraph`, `MdCode`, `MdList`, `MdTable`, `MdLink`, `MdImage`을 비롯한 전부이며, 각각 쓰인 자리를 `MdRange`로 들고 있습니다. Flutter 패키지의 노드 클래스와 이름이 같아서 두 파서를 비교할 수 있고, `tool/parity.dart`가 diff하는 대상이 이 트리입니다.

### `slugify`

```ts
function slugify(text: string): string;
```

제목의 앵커를 GitHub과 같은 방식으로 만듭니다. 어떤 방식을 고르는지보다 GitHub과 철자를 맞추는 것이 중요합니다. README 안의 앵커는 GitHub 기준으로 손으로 쓰이므로, `#getting-started`로 링크하는 문서는 GitHub이 그 제목에 붙였을 앵커를 가리키고 있습니다.

:::

::: fw flutter

파서는 내부에서만 쓰지 않고 밖으로도 내보냅니다. 문서의 개요나 각주, 제목의 앵커가 필요한 Dart 애플리케이션에는 그것을 얻을 다른 방법이 없기 때문입니다.

### `parseMarkdown`

```dart
MdDocument parseMarkdown(String source, [MawyParseOptions options = const MawyParseOptions()]);
```

`source`를 마크다운으로 읽습니다. 뷰어가 하는 것과 같은 호출이고 옵션도 같으므로, 여기서 파싱한 문서와 저기서 그린 문서는 같은 트리입니다.

### `MdDocument`

```dart
class MdDocument {
  final MdRoot root; // 블록들
  final List<MdOutlineEntry> outline; // 모든 제목, 순서대로, 각각 고유한 slug와 함께
  final List<MdFootnoteDefinition> footnotes; // 무언가가 가리킨 것들, 가리킨 순서대로
}
```

파싱된 문서입니다. 트리와 개요, 그리고 각주가 들어 있습니다. 각주는 `root` 안에 없습니다. 글쓴이는 편한 곳에 쓰고 독자는 맨 아래에서 읽으므로, 문서를 그리는 쪽이 본문 다음에 각주를 그립니다.

모든 노드 클래스를 함께 내보냅니다. `MdHeading`, `MdParagraph`, `MdCode`, `MdList`, `MdTable`, `MdLink`, `MdImage`을 비롯한 전부이며, 각각 쓰인 자리를 `MdRange`로 들고 있습니다. React 패키지의 노드 타입과 이름도 구조도 같습니다.

### `slugify`

```dart
String slugify(String text);
```

제목의 앵커를 GitHub과 같은 방식으로 만듭니다. 어떤 방식을 고르는지보다 GitHub과 철자를 맞추는 것이 중요합니다. README 안의 앵커는 GitHub 기준으로 손으로 쓰이므로, `#getting-started`로 링크하는 문서는 GitHub이 그 제목에 붙였을 앵커를 가리키고 있습니다.

:::

::: fw react

## 서버에서 그린 문서

`mawy-react/server`는 문서를 서버에서 한 번 그리고, 브라우저로 자바스크립트를 하나도 보내지 않습니다.

`MawyViewer`도 서버에서 잘 그려지고 그다음 하이드레이션합니다. 툴바와 찾기 막대, 목차, 복사 버튼은 모두 동작이 필요한 컨트롤이고, 동작하려면 컴포넌트가 페이지에 있어야 하기 때문입니다. 문서 사이트나 블로그, 변경 기록에는 이런 컨트롤이 필요 없습니다. 문서만 보여주는 페이지에 40 kB의 자바스크립트를 보내지 않기 위한 진입점입니다.

```tsx
import { MawyDocument } from 'mawy-react/server';
import 'mawy-react/styles.css';

export default async function Page() {
  return <MawyDocument value={await readFile('README.md', 'utf8')} />;
}
```

서버 컴포넌트를 지원하는 프레임워크에서는 React 서버 컴포넌트로, 그렇지 않은 곳에서는 `renderToStaticMarkup`에 넣는 일반 컴포넌트로 동작합니다. 마크업도 스타일시트도 같으므로, 이렇게 만든 페이지와 뷰어를 올린 페이지는 같아 보입니다.

### `MawyDocument`

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 마크다운. |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `{ gfm: true, breaks: false, definitionLists: true }` | 어떻게 읽을지. |
| `html` | [`MawyHtmlPolicy`](#mawyhtmlpolicy) | `'escape'` | 문서 안의 원본 HTML을 어떻게 할지. |
| `linkTarget` | `'blank' \| 'self'` | `'blank'` | 문서가 쓴 링크가 어디서 열릴지. |
| `directives` | [`MawyDirectives`](#mawydirectives) | — | 이 패키지가 모르는 구성 요소를 무엇이 그릴지. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | 이 라이브러리가 직접 쓰는 몇 낱말의 언어. |
| `highlight` | [`MawyHighlighter`](#mawyhighlighter) | — | 코드 블록을 무엇이 칠할지. |
| `typography` | [`MawyTypography`](#mawytypography) | — | 문서를 어떻게 조판할지. 같은 커스텀 프로퍼티로 나갑니다. |
| `fonts` | `MawyFont[]` | `MAWY_SYSTEM_FONTS` | 그 프로퍼티가 부를 수 있는 서체. |
| `colorScheme` | `'light' \| 'dark' \| null` | `null` | 어느 팔레트로 그릴지. `null`이면 페이지에 맡깁니다. |
| `className` | `string` | — | 이 라이브러리 자신의 이름 뒤에 붙습니다. |
| `style` | `CSSProperties` | — | 조판이 쓴 커스텀 프로퍼티 위에 덮입니다. |

없는 것과 그 이유:

- **툴바와 찾기 막대, 목차가 없습니다.** 셋 다 자바스크립트가 있어야 동작하는 컨트롤이라 여기서는 그리지 않습니다. 이 컨트롤이 필요하면 `MawyViewer`를 쓰세요.
- **코드 블록에 복사 버튼이 없습니다.** 같은 이유입니다.
- **`html="sanitize"`는 마크업을 글자로 그립니다.** 살균하려면 파싱할 DOM이 있어야 하는데 서버에는 없습니다. `MawyViewer`도 서버에서는 같게 동작하지만, 그쪽에는 요소가 나타날 다음 렌더가 있습니다. 여기에는 다음 렌더가 없습니다. `html="raw"`는 작성자가 쓴 그대로 내보내며, 그 의미는 [안전](../guide/viewer#안전)에 있습니다.
- **하이라이터는 동기로 답할 때만 씁니다.** 프로미스가 도착할 두 번째 렌더가 없기 때문입니다. `mawyHighlighter`나 다른 동기 하이라이터를 넘기면 색이 HTML 안에 들어갑니다.

:::
