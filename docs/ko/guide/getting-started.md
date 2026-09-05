---
title: 시작하기
order: 1
---

# 시작하기

Mawy는 프레임워크마다 패키지 하나로 배포되고, 그 둘은 같은 라이브러리입니다. 파서가 같고, 문서를 읽는 방식이 같으며, 팔레트의 색 값도 같습니다. 사이드바에서 쓰실 패키지를 고르세요. 메뉴 위의 스위치가 이 사이트 모든 페이지의 내용을 바꿉니다.

|             |                                                                |               |
| ----------- | -------------------------------------------------------------- | ------------- |
| **React**   | npm의 [`mawy-react`](https://www.npmjs.com/package/mawy-react) | 뷰어와 에디터 |
| **Flutter** | pub.dev의 [`mawy`](https://pub.dev/packages/mawy)              | 뷰어와 에디터 |

::: tip `1.0.0` 버전 정책

두 패키지 모두 `1.0.0`으로 게시되어 있습니다. 이 사이트는 설치하는 것과 같은 소스에서 두 패키지를 그리므로, 이 페이지에 적힌 것은 전부 실제로 동작합니다. 여기서부터 내보내는 API는 유의적 버전을 따르므로, 이름이 사라지거나 모양이 바뀌는 변경은 메이저 버전에서만 일어납니다. 릴리스마다 무엇이 바뀌었는지는 [변경 기록](../changelog)에 있습니다.

:::

## 요구 사항

::: fw react

- **React 18 또는 19**. `react-dom`과 함께 peer dependency입니다.
- 빌드에는 **Node.js 20.19 이상**이 필요합니다.
- `contenteditable`과 `Selection`, `beforeinput`을 지원하는 브라우저. 최신 브라우저는 모두 해당합니다.

:::

::: fw flutter

- **Flutter 3.32 이상**, 그리고 함께 설치되는 Dart SDK.
- 그 밖에는 없습니다. 이 패키지는 Material도 Cupertino도 import하지 않으므로, `MaterialApp`과 `CupertinoApp`은 물론 맨 `WidgetsApp` 안에서도 디자인 시스템을 추가로 설치하지 않고 그대로 동작합니다.

:::

## 설치

::: fw react

```bash
npm install mawy-react
```

`react`와 `react-dom`은 peer dependency입니다. 프로젝트에 이미 있다면 Mawy는 그 사본을 씁니다.

런타임 의존성은 툴바 아이콘을 제공하는 [`lucide-react`](https://lucide.dev) 하나입니다. ISC 라이선스이고, 다른 패키지를 함께 설치하지 않으며, 실제로 그리는 열몇 개 글리프만 남을 때까지 tree-shaking됩니다.

:::

::: fw flutter

```bash
flutter pub add mawy
```

의존성은 툴바 아이콘을 제공하는 [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter) 하나입니다. `lucide-react`와 같은 아이콘 세트를 쓰므로 두 툴바의 아이콘이 같습니다. MIT 라이선스이고 다른 패키지를 함께 설치하지 않습니다. 다만 이 패키지에서 크기가 큰 유일한 항목입니다. 빌드에 가변 폰트로 3 MB쯤 들어가는데, 앱 번들에서는 평범한 크기이고 웹에서는 미리 확인해 둘 값입니다.

:::

### 번들 크기

::: fw react

| 가져오는 것             | gzip    |
| ----------------------- | ------- |
| `MawyViewer`            | 26.8 kB |
| `MawyEditor`            | 44.8 kB |
| `mawy-react/markdown`   | 10.5 kB |
| `mawy-react/highlight`  | 2.8 kB  |
| `mawy-react/styles.css` | 6.0 kB  |

React는 애플리케이션에 이미 있으므로 세지 않았고, `lucide-react`는 이 패키지와 함께 설치되므로 셌습니다. **문서를 읽기만 하는 페이지는 에디터를 싣지 않습니다.** 툴바와 되돌리기 기록, 붙여넣기 경로, `contenteditable` 화면이 모두 번들에서 빠져 17 kB가 줄어듭니다.

`mawy-react/markdown`은 파서만 따로 가져오는 진입점입니다. 아무것도 그리지 않고 문서의 목차나 각주만 필요한 애플리케이션을 위한 것입니다. `mawy-react/server`는 서버에서 문서를 그려 HTML로 내보내므로 브라우저로 **아무것도** 보내지 않습니다. 잴 값이 없어서 표에도 넣지 않았습니다.

이 숫자는 배포되는 파일을 실제로 번들해서 잰 값입니다. `packages/react/size-budget.json`에 적혀 있고, 이를 넘기는 변경은 CI가 막습니다.

:::

::: fw flutter

앱 번들은 웹 페이지처럼 재지 않습니다. 여기서 확인해 둘 값은 위에 적은 아이콘 폰트의 3 MB 하나이고, 이 절의 나머지 내용은 React 패키지에만 해당합니다.

:::

## 연결하기

::: fw react

애플리케이션의 CSS 진입점에 한 줄을 더합니다.

```css
@import 'mawy-react/styles.css';
```

이 스타일시트는 완성된 CSS입니다. 빌드 설정도 플러그인도 따로 맞출 구성도 없습니다. 라이브러리가 그리는 모든 값이 `--mawy-*` 커스텀 속성을 지나므로, 테마는 선택자 우선순위를 다투는 대신 토큰을 다시 선언해서 바꿉니다. 토큰은 상속되므로 감싸는 엘리먼트에 한 번 선언하면 그 안의 모든 Mawy 화면에 적용됩니다.

:::

::: fw flutter

연결할 것이 없습니다. 팔레트는 전역 설정이 아니라 위젯을 따라 내려가므로, 밝은 화면 안에서 문서 하나만 어둡게 할 수 있습니다.

```dart
import 'package:mawy/mawy.dart';
```

:::

## 문서 보여주기

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

:::

이것으로 읽기 화면은 완성입니다. 그려진 문서와 툴바가 함께 나오고, 툴바에서 글자 크기와 줄 간격, 테마, 본문 폭을 바꿀 수 있습니다. 어느 것도 문서 자체를 바꾸지는 않습니다.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

## 툴바 구성하기

::: fw react

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

`true`는 전부, `false`는 없음이고, 배열을 주면 그 컨트롤을 그 순서 그대로 그립니다.

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  toolbar: const <MawyViewerToolbarItem>[
    MawyViewerToolbarItem.fontSize,
    MawyViewerToolbarItem.colorScheme,
  ],
);
```

`kMawyViewerToolbar`가 전부이고 `const []`는 없음입니다. 목록을 주면 그 컨트롤을 그 순서 그대로 그립니다.

:::

목록은 [뷰어](./viewer#툴바)에 있습니다.

## 문서 쓰기

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

export function Page() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

문법에 색이 입혀진 마크다운 원문과 그 옆의 실시간 미리보기, 모든 명령에 키보드 단축키가 딸린 서식 툴바, 글자와 낱말을 세는 상태 표시줄이 함께 있습니다. 나머지는 [에디터](./editor)에 있습니다.

:::

::: fw flutter

문법에 색이 입혀진 마크다운 원문, 그 옆의 실시간 미리보기, 서식 툴바, 그리고 글자와 낱말을 세는 상태 표시줄이 함께 있습니다.

```dart
MawyEditor(defaultValue: '# Hello', onChange: save);
```

화면은 `plain`, `split`, `preview` 셋입니다. React 패키지에 있는 `wysiwyg`가 여기에는 없습니다. 그려진 자리에서 문서를 편집하는 이 화면은 `contenteditable`에 전적으로 의존하는데 Flutter에는 그에 해당하는 것이 없어서, 여기서 그려지는 화면은 뷰어로 남습니다. 자세한 이유는 [에디터](./editor)에 있습니다.

:::

## 문서가 아예 없을 때

::: fw react

`value`는 선택입니다. 보여줄 문서가 없으면 뷰어가 파일 선택기가 됩니다. `.md` 파일을 끌어다 놓거나, 골라서 여세요.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

:::

::: fw flutter

`value`는 필수입니다. 파일을 열려면 파일 선택기 플러그인이 필요한데, 이 패키지는 그것을 포함하지 않습니다. 애플리케이션에는 대개 이미 있는 의존성입니다. 파일을 읽는 일은 애플리케이션이 맡고, 그리는 일은 Mawy가 맡습니다.

:::

## 패키지에 든 것

::: fw react

|  |  |
| --- | --- |
| `MawyViewer` | 읽기 전용 뷰어. [가이드](./viewer), [API](../api/#mawyviewer) |
| `MawyEditor` | 에디터. [가이드](./editor) |
| `mawy-react/highlight` | 문법 하이라이터. 진입점이 따로 있습니다 |
| `mawy-react/styles.css` | 위의 스타일시트 |
| 타입 | `MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyHighlight`, `MawyImageUpload`, 그리고 툴바·상태 항목 타입들 |

타입은 `mawy-react/types`에서도 가져올 수 있습니다. 컴포넌트를 import하지 않고 자기 props에 이 이름들을 쓰려는 애플리케이션을 위한 진입점입니다.

:::

::: fw flutter

|  |  |
| --- | --- |
| `MawyViewer` | 읽기 전용 뷰어. [가이드](./viewer) |
| `MawyEditor` | 에디터. 원문과 미리보기, 그 사이의 전환. [가이드](./editor) |
| `parseMarkdown` | 파서, 그리고 그것이 만드는 `Md*` 트리 전부 |
| `MawyTokens` | 팔레트. `MawyTokens.light`와 `MawyTokens.dark`, 그리고 직접 만들 때의 `copyWith` |
| `mawyHighlighter` | 문법 하이라이터. 직접 참조해야 빌드에 남습니다 |
| 타입 | `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyViewerToolbarItem`, `MawyTokensBuilder`, `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind`, `MawyMatch` |

`package:mawy/mawy.dart` 하나를 import하면 전부입니다.

:::

## 다음 읽을 것

- [**직접 써보기**](./playground) — 두 컴포넌트를 아무것도 끄지 않고 올려 둔, 직접 입력해 보는 페이지.
- [**뷰어**](./viewer) — 편집하지 않고 문서를 그리기.
- [**에디터**](./editor) — 원문과 미리보기, 그 사이의 전환. React에서는 그려진 문서를 그 자리에서 고치는 화면까지.
- [**API**](../api/) — 모든 컴포넌트와 모든 옵션.
